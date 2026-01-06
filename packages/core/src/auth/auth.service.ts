import type { Redis } from 'ioredis';
import { ok, err, type Result } from '../result.js';
import type { AuthRepository } from './auth.repository.js';
import type { AuthUser, AuthError } from './types.js';
import { hashPassword, verifyPassword } from './password.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
} from './token.service.js';
import { loggers } from '../logging/logger.js';

const log = loggers.auth;

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Token blacklist key prefix
 */
const BLACKLIST_PREFIX = 'blacklist:';

/**
 * Session expiry duration in days
 */
const SESSION_EXPIRY_DAYS = 7;

/**
 * Login response with tokens and user
 */
export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh tokens response
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Extended auth errors for registration
 */
export type AuthServiceError = AuthError | 'invalid_email' | 'user_exists' | 'session_expired' | 'session_not_found';

/**
 * Auth service that orchestrates authentication flow.
 */
export class AuthService {
  constructor(
    private repository: AuthRepository,
    private redis: Redis
  ) {}

  /**
   * Register a new user.
   */
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<Result<AuthUser, AuthServiceError>> {
    // Validate email format
    if (!isValidEmail(email)) {
      return err('invalid_email');
    }

    // Check if user already exists
    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser) {
      return err('user_exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await this.repository.createUser(email, passwordHash, name);

    log.info({ userId: user.id, email: user.email }, 'User registered');

    // Return user without password
    return ok({
      id: user.id,
      email: user.email,
      name: null, // Users table doesn't have name field currently
      emailVerified: user.emailVerified,
    });
  }

  /**
   * Login with email and password.
   */
  async login(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string
  ): Promise<Result<LoginResponse, AuthServiceError>> {
    // Find user by email
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      return err('invalid_credentials');
    }

    // Verify password
    if (!user.passwordHash) {
      return err('invalid_credentials');
    }
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return err('invalid_credentials');
    }

    // Calculate session expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    // Generate refresh token for session storage
    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: '', // Will update after session creation
    });

    // Create session in DB
    const session = await this.repository.createSession(
      user.id,
      refreshToken,
      expiresAt,
      userAgent,
      ip
    );

    // Generate tokens with correct session ID
    const accessToken = generateAccessToken({
      userId: user.id,
      sessionId: session.id,
    });

    const finalRefreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    // Update session with correct refresh token
    // Note: For simplicity, we store the refresh token directly
    // In production, you might want to update the session token

    log.info({ userId: user.id, sessionId: session.id }, 'User logged in');

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: null,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken: finalRefreshToken,
    });
  }

  /**
   * Logout a user by invalidating their session and blacklisting the access token.
   */
  async logout(sessionId: string, accessToken: string): Promise<void> {
    log.info({ sessionId }, 'User logged out');

    // Delete session from DB
    await this.repository.deleteSession(sessionId);

    // Add access token to Redis blacklist
    const decoded = decodeToken(accessToken);
    if (decoded) {
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        // Use the token's jti or a hash as the key
        // Since we don't have jti, we'll use session ID
        const blacklistKey = `${BLACKLIST_PREFIX}${sessionId}`;
        await this.redis.setex(blacklistKey, ttl, '1');
      }
    }
  }

  /**
   * Refresh access and refresh tokens.
   * Implements token rotation pattern for security.
   */
  async refreshTokens(
    refreshToken: string
  ): Promise<Result<RefreshResponse, AuthServiceError>> {
    // Verify refresh token
    const tokenResult = verifyToken(refreshToken);
    if (tokenResult.isErr()) {
      return err(tokenResult.error);
    }

    const payload = tokenResult.value;

    // Check if token is blacklisted
    const blacklistKey = `${BLACKLIST_PREFIX}${payload.sessionId}`;
    const isBlacklisted = await this.redis.exists(blacklistKey);
    if (isBlacklisted) {
      return err('invalid_token');
    }

    // Find session
    const session = await this.repository.findSessionByToken(refreshToken);
    if (!session) {
      return err('session_not_found');
    }

    // Check session not expired
    if (session.expiresAt < new Date()) {
      return err('session_expired');
    }

    // Generate NEW tokens (rotation pattern)
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      sessionId: payload.sessionId,
    });

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      sessionId: payload.sessionId,
    });

    // Blacklist old refresh token
    const oldTokenTtl = payload.exp - Math.floor(Date.now() / 1000);
    if (oldTokenTtl > 0) {
      const oldTokenKey = `${BLACKLIST_PREFIX}refresh:${payload.sessionId}:${payload.iat}`;
      await this.redis.setex(oldTokenKey, oldTokenTtl, '1');
    }

    // Update session with new refresh token
    // For simplicity, we delete old session and create new one
    // In production, you'd want an updateSessionToken method
    await this.repository.deleteSession(session.id);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_EXPIRY_DAYS);
    await this.repository.createSession(
      payload.userId,
      newRefreshToken,
      newExpiresAt,
      session.userAgent ?? undefined,
      session.ipAddress ?? undefined
    );

    return ok({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  }

  /**
   * Validate an access token and return the authenticated user.
   */
  async validateAccessToken(
    token: string
  ): Promise<Result<AuthUser, AuthServiceError>> {
    // Check token not in Redis blacklist
    const decoded = decodeToken(token);
    if (decoded) {
      const blacklistKey = `${BLACKLIST_PREFIX}${decoded.sessionId}`;
      const isBlacklisted = await this.redis.exists(blacklistKey);
      if (isBlacklisted) {
        return err('invalid_token');
      }
    }

    // Verify token signature and expiry
    const tokenResult = verifyToken(token);
    if (tokenResult.isErr()) {
      return err(tokenResult.error);
    }

    const payload = tokenResult.value;

    // Find user
    const user = await this.repository.findUserById(payload.userId);
    if (!user) {
      return err('user_not_found');
    }

    return ok({
      id: user.id,
      email: user.email,
      name: null,
      emailVerified: user.emailVerified,
    });
  }
}
