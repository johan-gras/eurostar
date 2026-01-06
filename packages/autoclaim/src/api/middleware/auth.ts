/**
 * Authentication middleware.
 *
 * Placeholder JWT validation - extracts userId from token.
 * In production, this would properly validate JWT tokens.
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { createErrorResponse, ApiErrorCode } from '../types.js';

/**
 * JWT payload structure.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extend FastifyRequest to include user context.
 */
declare module 'fastify' {
  interface FastifyRequest {
    jwtUser?: JwtPayload;
  }
}

/**
 * Auth options for the plugin.
 */
export interface AuthOptions {
  /** JWT secret (required in production) */
  secret?: string;
  /** Skip auth for testing */
  skipAuth?: boolean;
  /** Mock user for testing */
  mockUser?: JwtPayload;
}

/**
 * Register auth plugin on Fastify instance.
 */
export async function registerAuth(
  app: FastifyInstance,
  options: AuthOptions = {}
): Promise<void> {
  const { secret, skipAuth = false, mockUser } = options;

  // Register JWT plugin if secret is provided
  if (secret) {
    const fastifyJwt = await import('@fastify/jwt');
    await app.register(fastifyJwt.default, {
      secret,
      sign: {
        expiresIn: '7d',
      },
    });
  }

  // Add auth decorator
  app.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Skip auth for testing
    if (skipAuth && mockUser) {
      request.jwtUser = mockUser;
      return;
    }

    try {
      // Check Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        reply.status(401).send(
          createErrorResponse(
            ApiErrorCode.UNAUTHORIZED,
            'Authorization header is required'
          )
        );
        return;
      }

      if (!authHeader.startsWith('Bearer ')) {
        reply.status(401).send(
          createErrorResponse(
            ApiErrorCode.INVALID_TOKEN,
            'Invalid authorization format. Use Bearer token'
          )
        );
        return;
      }

      const token = authHeader.slice(7);

      if (!token) {
        reply.status(401).send(
          createErrorResponse(
            ApiErrorCode.INVALID_TOKEN,
            'Token is required'
          )
        );
        return;
      }

      // Verify JWT
      if (secret && app.jwt) {
        const decoded = await app.jwt.verify<JwtPayload>(token);
        request.jwtUser = decoded;
      } else {
        // Placeholder: decode without verification for dev
        // In production, ALWAYS verify tokens
        const payload = decodeToken(token);
        if (!payload) {
          reply.status(401).send(
            createErrorResponse(
              ApiErrorCode.INVALID_TOKEN,
              'Invalid token format'
            )
          );
          return;
        }
        request.jwtUser = payload;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          reply.status(401).send(
            createErrorResponse(
              ApiErrorCode.TOKEN_EXPIRED,
              'Token has expired'
            )
          );
          return;
        }
      }

      reply.status(401).send(
        createErrorResponse(
          ApiErrorCode.INVALID_TOKEN,
          'Invalid or expired token'
        )
      );
    }
  });
}

/**
 * Decode a JWT token without verification.
 * Only for development - production must verify.
 */
function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1]!, 'base64url').toString('utf8')
    ) as JwtPayload;

    // Basic validation
    if (!payload.userId || !payload.email) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Auth preHandler hook for protected routes.
 */
export function authPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
): void {
  const app = request.server as FastifyInstance & { authenticate?: typeof authenticateHandler };
  if (app.authenticate) {
    app.authenticate(request, reply).then(() => done()).catch(done);
  } else {
    reply.status(500).send(
      createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        'Auth not configured'
      )
    );
  }
}

// Type helper for authenticate decorator
async function authenticateHandler(
  _request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // Implemented via decorator
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticateHandler;
  }
}

/**
 * Creates a test token for development/testing.
 */
export function createTestToken(payload: JwtPayload): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })
  ).toString('base64url');

  // Fake signature for testing only
  const signature = Buffer.from('test-signature').toString('base64url');

  return `${header}.${body}.${signature}`;
}
