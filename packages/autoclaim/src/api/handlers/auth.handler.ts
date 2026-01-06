/**
 * Authentication routes handler.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '@eurostar/core/db';
import type { Redis } from 'ioredis';
import { AuthService, AuthRepository } from '@eurostar/core/auth';
import {
  RegisterBodySchema,
  type RegisterBody,
  LoginBodySchema,
  type LoginBody,
  RefreshBodySchema,
  type RefreshBody,
  AuthResponseSchema,
  UserDataResponseSchema,
  LogoutResponseSchema,
  type UserResponse,
} from '../schemas/auth.schema.js';
import { ErrorResponseSchema } from '../schemas.js';
import { ApiException } from '../middleware/error-handler.js';
import { ApiErrorCode } from '../types.js';

/**
 * Access token expiry in seconds (15 minutes)
 */
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;

/**
 * Auth routes options.
 */
export interface AuthRoutesOptions {
  db: Database;
  redis: Redis;
}

/**
 * Transform auth user to API response format.
 */
function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  emailVerified?: boolean;
}, createdAt?: Date): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    createdAt: createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Register authentication routes.
 */
export function registerAuthRoutes(
  app: FastifyInstance,
  options: AuthRoutesOptions
): void {
  const { db, redis } = options;

  // Create auth repository and service
  const authRepository = new AuthRepository(db);
  const authService = new AuthService(authRepository, redis);

  /**
   * POST /api/v1/auth/register - Register a new user
   * Rate limit: 10 requests per minute (stricter for auth)
   */
  app.post<{
    Body: RegisterBody;
  }>(
    '/api/v1/auth/register',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: RegisterBodySchema,
        response: {
          201: AuthResponseSchema,
          400: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      const { email, password, name } = request.body;

      // Register user
      const result = await authService.register(email, password, name);

      if (result.isErr()) {
        const error = result.error;
        if (error === 'invalid_email') {
          throw ApiException.badRequest('Invalid email format', ApiErrorCode.VALIDATION_ERROR);
        }
        if (error === 'user_exists') {
          throw ApiException.conflict('User with this email already exists', ApiErrorCode.ALREADY_EXISTS);
        }
        throw ApiException.internal('Registration failed');
      }

      const user = result.value;

      // Log in the newly registered user
      const loginResult = await authService.login(
        email,
        password,
        request.headers['user-agent'],
        request.ip
      );

      if (loginResult.isErr()) {
        throw ApiException.internal('Failed to create session');
      }

      const { accessToken, refreshToken } = loginResult.value;

      return reply.status(201).send({
        data: {
          user: toUserResponse(user),
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        },
      });
    }
  );

  /**
   * POST /api/v1/auth/login - Login with email and password
   * Rate limit: 10 requests per minute (stricter for auth)
   */
  app.post<{
    Body: LoginBody;
  }>(
    '/api/v1/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      const result = await authService.login(
        email,
        password,
        request.headers['user-agent'],
        request.ip
      );

      if (result.isErr()) {
        const error = result.error;
        if (error === 'invalid_credentials') {
          throw ApiException.unauthorized('Invalid email or password', ApiErrorCode.UNAUTHORIZED);
        }
        throw ApiException.internal('Login failed');
      }

      const { user, accessToken, refreshToken } = result.value;

      return reply.send({
        data: {
          user: toUserResponse(user),
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        },
      });
    }
  );

  /**
   * POST /api/v1/auth/logout - Logout (invalidate session)
   */
  app.post(
    '/api/v1/auth/logout',
    {
      preHandler: [app.authenticate],
      schema: {
        response: {
          200: LogoutResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.jwtUser;
      if (!user) {
        throw ApiException.unauthorized('Not authenticated', ApiErrorCode.UNAUTHORIZED);
      }

      // Extract access token from Authorization header
      const authHeader = request.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : '';

      // Get session ID from the token payload if available
      // The session ID is stored in the JWT payload
      const sessionId = (user as { sessionId?: string }).sessionId;

      if (sessionId) {
        await authService.logout(sessionId, accessToken);
      }

      return reply.send({
        data: {
          message: 'Successfully logged out',
        },
      });
    }
  );

  /**
   * POST /api/v1/auth/refresh - Refresh access token
   * Rate limit: 20 requests per minute (stricter for auth)
   */
  app.post<{
    Body: RefreshBody;
  }>(
    '/api/v1/auth/refresh',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: RefreshBodySchema,
        response: {
          200: AuthResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) => {
      const { refreshToken } = request.body;

      const result = await authService.refreshTokens(refreshToken);

      if (result.isErr()) {
        const error = result.error;
        if (error === 'invalid_token' || error === 'expired_token') {
          throw new ApiException(401, ApiErrorCode.INVALID_TOKEN, 'Invalid or expired refresh token');
        }
        if (error === 'session_not_found' || error === 'session_expired') {
          throw new ApiException(401, ApiErrorCode.TOKEN_EXPIRED, 'Session expired, please login again');
        }
        throw ApiException.internal('Token refresh failed');
      }

      const { accessToken, refreshToken: newRefreshToken } = result.value;

      // We need to get the user info for the response
      // Validate the new access token to get user
      const userResult = await authService.validateAccessToken(accessToken);

      if (userResult.isErr()) {
        throw ApiException.internal('Token refresh failed');
      }

      const user = userResult.value;

      return reply.send({
        data: {
          user: toUserResponse(user),
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        },
      });
    }
  );

  /**
   * GET /api/v1/auth/me - Get current authenticated user
   */
  app.get(
    '/api/v1/auth/me',
    {
      preHandler: [app.authenticate],
      schema: {
        response: {
          200: UserDataResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const jwtUser = request.jwtUser;
      if (!jwtUser) {
        throw ApiException.unauthorized('Not authenticated', ApiErrorCode.UNAUTHORIZED);
      }

      // Get full user from database
      const user = await authRepository.findUserById(jwtUser.userId);

      if (!user) {
        throw ApiException.notFound('User not found', ApiErrorCode.USER_NOT_FOUND);
      }

      return reply.send({
        data: toUserResponse(
          {
            id: user.id,
            email: user.email,
            name: null,
            emailVerified: user.emailVerified,
          },
          user.createdAt
        ),
      });
    }
  );
}
