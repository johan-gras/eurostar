import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_CONFIG,
} from '../token.service.js';

const TEST_SECRET = 'test-secret-key-for-testing';

describe('token.service', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };

      const token = generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };

      const token = generateAccessToken(payload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.userId).toBe('user-123');
      expect(decoded.sessionId).toBe('session-456');
    });

    it('should set expiration to approximately 15 minutes', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };

      const token = generateAccessToken(payload);
      const decoded = jwt.decode(token) as { exp: number; iat: number };

      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(15 * 60); // 15 minutes in seconds
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };

      const token = generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload data in token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };

      const token = generateRefreshToken(payload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.userId).toBe('user-123');
      expect(decoded.sessionId).toBe('session-456');
    });

    it('should set expiration to approximately 7 days', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };

      const token = generateRefreshToken(payload);
      const decoded = jwt.decode(token) as { exp: number; iat: number };

      const expiryDuration = decoded.exp - decoded.iat;
      expect(expiryDuration).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      const token = generateAccessToken(payload);

      const result = verifyToken(token);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe('user-123');
        expect(result.value.sessionId).toBe('session-456');
      }
    });

    it('should return error for expired token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      // Create a token that expires in 1 second
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1ms' });

      // Wait for token to expire
      const result = new Promise<ReturnType<typeof verifyToken>>((resolve) => {
        setTimeout(() => {
          resolve(verifyToken(token));
        }, 10);
      });

      return result.then((res) => {
        expect(res.isErr()).toBe(true);
        if (res.isErr()) {
          expect(res.error).toBe('expired_token');
        }
      });
    });

    it('should return error for invalid signature', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '15m' });

      const result = verifyToken(token);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for malformed token', () => {
      const result = verifyToken('not-a-valid-jwt');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for empty token', () => {
      const result = verifyToken('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for token with wrong algorithm', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      const token = jwt.sign(payload, TEST_SECRET, {
        expiresIn: '15m',
        algorithm: 'HS384',
      });

      const result = verifyToken(token);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      const token = generateAccessToken(payload);

      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.sessionId).toBe('session-456');
      expect(decoded?.exp).toBeDefined();
      expect(decoded?.iat).toBeDefined();
    });

    it('should decode an expired token', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      // Create a token that's already expired
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '-1h' });

      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
    });

    it('should decode a token with wrong signature', () => {
      const payload = { userId: 'user-123', sessionId: 'session-456' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '15m' });

      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
    });

    it('should return null for malformed token', () => {
      const decoded = decodeToken('not-a-valid-jwt');

      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeToken('');

      expect(decoded).toBeNull();
    });

    it('should return null for token missing required fields', () => {
      // Create a token without sessionId
      const token = jwt.sign({ userId: 'user-123' }, TEST_SECRET);

      const decoded = decodeToken(token);

      expect(decoded).toBeNull();
    });
  });

  describe('cookie configuration', () => {
    it('should export correct cookie names', () => {
      expect(ACCESS_TOKEN_COOKIE).toBe('access_token');
      expect(REFRESH_TOKEN_COOKIE).toBe('refresh_token');
    });

    it('should have correct access token cookie config', () => {
      expect(COOKIE_CONFIG.accessToken.httpOnly).toBe(false);
      expect(COOKIE_CONFIG.accessToken.sameSite).toBe('strict');
      expect(COOKIE_CONFIG.accessToken.maxAge).toBe(15 * 60);
    });

    it('should have correct refresh token cookie config', () => {
      expect(COOKIE_CONFIG.refreshToken.httpOnly).toBe(true);
      expect(COOKIE_CONFIG.refreshToken.secure).toBe(true);
      expect(COOKIE_CONFIG.refreshToken.sameSite).toBe('strict');
      expect(COOKIE_CONFIG.refreshToken.maxAge).toBe(7 * 24 * 60 * 60);
    });
  });
});
