import jwt from 'jsonwebtoken';
import { ok, err, type Result } from '../result.js';
import type { TokenPayload, AuthError } from './types.js';

/**
 * Token expiry durations
 */
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Cookie configuration constants for use in API
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const COOKIE_CONFIG = {
  accessToken: {
    httpOnly: false, // SPA needs to read token for auth headers
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict' as const,
    maxAge: 15 * 60, // 15 minutes in seconds
  },
  refreshToken: {
    httpOnly: true, // Not accessible via JavaScript
    secure: true,
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
} as const;

/**
 * Get the JWT secret from environment or use a fallback for development.
 * IMPORTANT: Always set JWT_SECRET in production environments.
 */
function getSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Development fallback - not secure, but allows local development
    return 'dev-secret-do-not-use-in-production';
  }
  return secret;
}

/**
 * Payload for token generation (without exp/iat which are added by jwt library)
 */
interface TokenGenerationPayload {
  userId: string;
  sessionId: string;
}

/**
 * Generate an access token (short-lived, 15 minutes)
 * @param payload - The payload to encode in the token
 * @returns The signed JWT access token
 */
export function generateAccessToken(payload: TokenGenerationPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Generate a refresh token (long-lived, 7 days)
 * @param payload - The payload to encode in the token
 * @returns The signed JWT refresh token
 */
export function generateRefreshToken(payload: TokenGenerationPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Verify a token and return its payload
 * @param token - The JWT token to verify
 * @returns Result with the decoded payload or an AuthError
 */
export function verifyToken(token: string): Result<TokenPayload, AuthError> {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
    }) as TokenPayload;
    return ok(decoded);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return err('expired_token');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return err('invalid_token');
    }
    // Unknown error - treat as invalid token
    return err('invalid_token');
  }
}

/**
 * Decode a token without verification (useful for reading expired tokens)
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if malformed
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    // Validate that decoded object has required fields
    if (
      typeof decoded['userId'] === 'string' &&
      typeof decoded['sessionId'] === 'string' &&
      typeof decoded['exp'] === 'number' &&
      typeof decoded['iat'] === 'number'
    ) {
      return decoded as TokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
