/**
 * TypeBox schemas for authentication API request validation.
 */

import { Type, type Static } from '@sinclair/typebox';

// ============================================================================
// Request Body Schemas
// ============================================================================

/**
 * Email format validation.
 */
export const EmailSchema = Type.String({
  format: 'email',
  minLength: 1,
  maxLength: 255,
});

/**
 * Password validation (minimum 8 characters).
 */
export const PasswordSchema = Type.String({
  minLength: 8,
  maxLength: 128,
});

/**
 * Register request body.
 */
export const RegisterBodySchema = Type.Object({
  email: EmailSchema,
  password: PasswordSchema,
  name: Type.String({ minLength: 1, maxLength: 255 }),
});

export type RegisterBody = Static<typeof RegisterBodySchema>;

/**
 * Login request body.
 */
export const LoginBodySchema = Type.Object({
  email: EmailSchema,
  password: PasswordSchema,
});

export type LoginBody = Static<typeof LoginBodySchema>;

/**
 * Refresh token request body.
 */
export const RefreshBodySchema = Type.Object({
  refreshToken: Type.String({ minLength: 1, maxLength: 2048 }),
});

export type RefreshBody = Static<typeof RefreshBodySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * User response schema (safe, no password).
 */
export const UserResponseSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  createdAt: Type.String(),
});

export type UserResponse = Static<typeof UserResponseSchema>;

/**
 * Auth response with tokens.
 */
export const AuthResponseSchema = Type.Object({
  data: Type.Object({
    user: UserResponseSchema,
    accessToken: Type.String(),
    refreshToken: Type.String(),
    expiresIn: Type.Integer(),
  }),
});

export type AuthResponse = Static<typeof AuthResponseSchema>;

/**
 * Single user response wrapper.
 */
export const UserDataResponseSchema = Type.Object({
  data: UserResponseSchema,
});

/**
 * Logout response.
 */
export const LogoutResponseSchema = Type.Object({
  data: Type.Object({
    message: Type.String(),
  }),
});
