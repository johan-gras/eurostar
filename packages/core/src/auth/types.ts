import type { Result } from '../result.js';

/**
 * Authenticated user information (safe to expose to client)
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

/**
 * Session information
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: string;
  sessionId: string;
  exp: number;
  iat: number;
}

/**
 * Authentication error types
 */
export type AuthError =
  | 'invalid_credentials'
  | 'expired_token'
  | 'invalid_token'
  | 'user_not_found';

/**
 * Result type for authentication operations
 */
export type AuthResult = Result<AuthUser, AuthError>;
