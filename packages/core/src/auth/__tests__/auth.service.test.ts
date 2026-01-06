import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Redis } from 'ioredis';
import { AuthService } from '../auth.service.js';
import type { AuthRepository } from '../auth.repository.js';
import type { User, Session } from '../../db/schema.js';
import * as passwordService from '../password.service.js';
import * as tokenService from '../token.service.js';
import { ok, err } from '../../result.js';
import type { TokenPayload } from '../token.service.js';

// Mock the password and token services
vi.mock('../password.service.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('../token.service.js', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyToken: vi.fn(),
  decodeToken: vi.fn(),
}));

// Mock data
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpassword',
  emailVerified: false,
  verificationToken: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockSession: Session = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  userId: mockUser.id,
  token: 'refresh-token-abc123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  userAgent: 'Mozilla/5.0',
  ipAddress: '192.168.1.1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const mockTokenPayload = {
  userId: mockUser.id,
  sessionId: mockSession.id,
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
  iat: Math.floor(Date.now() / 1000),
};

// Create mock repository
function createMockRepository(): AuthRepository {
  return {
    createUser: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    updatePassword: vi.fn(),
    createSession: vi.fn(),
    findSessionByToken: vi.fn(),
    deleteSession: vi.fn(),
    deleteUserSessions: vi.fn(),
  } as unknown as AuthRepository;
}

// Create mock Redis
function createMockRedis(): Redis {
  return {
    setex: vi.fn(),
    exists: vi.fn().mockResolvedValue(0),
    del: vi.fn(),
  } as unknown as Redis;
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepo: AuthRepository;
  let mockRedis: Redis;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepository();
    mockRedis = createMockRedis();
    authService = new AuthService(mockRepo, mockRedis);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(null);
      vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser);
      vi.mocked(passwordService.hashPassword).mockResolvedValue('hashed-password');

      const result = await authService.register('test@example.com', 'password123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          name: null,
          emailVerified: mockUser.emailVerified,
        });
      }
      expect(passwordService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockRepo.createUser).toHaveBeenCalledWith(
        'test@example.com',
        'hashed-password',
        undefined
      );
    });

    it('should return invalid_email error for invalid email format', async () => {
      const result = await authService.register('not-an-email', 'password123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_email');
      }
      expect(mockRepo.findUserByEmail).not.toHaveBeenCalled();
    });

    it('should return user_exists error if email already taken', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(mockUser);

      const result = await authService.register('test@example.com', 'password123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('user_exists');
      }
      expect(mockRepo.createUser).not.toHaveBeenCalled();
    });

    it('should accept optional name parameter', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(null);
      vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser);
      vi.mocked(passwordService.hashPassword).mockResolvedValue('hashed-password');

      await authService.register('test@example.com', 'password123', 'John Doe');

      expect(mockRepo.createUser).toHaveBeenCalledWith(
        'test@example.com',
        'hashed-password',
        'John Doe'
      );
    });
  });

  describe('login', () => {
    beforeEach(() => {
      vi.mocked(tokenService.generateAccessToken).mockReturnValue('access-token-xyz');
      vi.mocked(tokenService.generateRefreshToken).mockReturnValue('refresh-token-xyz');
    });

    it('should successfully login with valid credentials', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.verifyPassword).mockResolvedValue(true);
      vi.mocked(mockRepo.createSession).mockResolvedValue(mockSession);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          name: null,
          emailVerified: mockUser.emailVerified,
        });
        expect(result.value.accessToken).toBe('access-token-xyz');
        expect(result.value.refreshToken).toBe('refresh-token-xyz');
      }
    });

    it('should return invalid_credentials for non-existent user', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(null);

      const result = await authService.login('nonexistent@example.com', 'password123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_credentials');
      }
    });

    it('should return invalid_credentials for wrong password', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.verifyPassword).mockResolvedValue(false);

      const result = await authService.login('test@example.com', 'wrongpassword');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_credentials');
      }
    });

    it('should return invalid_credentials for user without password hash', async () => {
      const userWithoutPassword = { ...mockUser, passwordHash: null };
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(userWithoutPassword);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_credentials');
      }
    });

    it('should create session with userAgent and IP', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.verifyPassword).mockResolvedValue(true);
      vi.mocked(mockRepo.createSession).mockResolvedValue(mockSession);

      await authService.login('test@example.com', 'password123', 'Mozilla/5.0', '192.168.1.1');

      expect(mockRepo.createSession).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
        'Mozilla/5.0',
        '192.168.1.1'
      );
    });

    it('should create session without optional fields', async () => {
      vi.mocked(mockRepo.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordService.verifyPassword).mockResolvedValue(true);
      vi.mocked(mockRepo.createSession).mockResolvedValue(mockSession);

      await authService.login('test@example.com', 'password123');

      expect(mockRepo.createSession).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
        undefined,
        undefined
      );
    });
  });

  describe('logout', () => {
    it('should delete session and blacklist access token', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(mockTokenPayload);

      await authService.logout(mockSession.id, 'access-token-xyz');

      expect(mockRepo.deleteSession).toHaveBeenCalledWith(mockSession.id);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `blacklist:${mockSession.id}`,
        expect.any(Number),
        '1'
      );
    });

    it('should handle token without expiry gracefully', async () => {
      const expiredPayload = {
        ...mockTokenPayload,
        exp: Math.floor(Date.now() / 1000) - 100, // Already expired
      };
      vi.mocked(tokenService.decodeToken).mockReturnValue(expiredPayload);

      await authService.logout(mockSession.id, 'access-token-xyz');

      expect(mockRepo.deleteSession).toHaveBeenCalledWith(mockSession.id);
      // Should not blacklist since TTL would be negative
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should handle invalid token gracefully', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(null);

      await authService.logout(mockSession.id, 'invalid-token');

      expect(mockRepo.deleteSession).toHaveBeenCalledWith(mockSession.id);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      vi.mocked(tokenService.generateAccessToken).mockReturnValue('new-access-token');
      vi.mocked(tokenService.generateRefreshToken).mockReturnValue('new-refresh-token');
    });

    it('should successfully refresh tokens', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRepo.findSessionByToken).mockResolvedValue(mockSession);
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.createSession).mockResolvedValue({
        ...mockSession,
        token: 'new-refresh-token',
      });

      const result = await authService.refreshTokens('old-refresh-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.accessToken).toBe('new-access-token');
        expect(result.value.refreshToken).toBe('new-refresh-token');
      }
    });

    it('should return error for invalid refresh token', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue(err('invalid_token' as const));

      const result = await authService.refreshTokens('invalid-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for blacklisted token', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRedis.exists).mockResolvedValue(1);

      const result = await authService.refreshTokens('blacklisted-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for non-existent session', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.findSessionByToken).mockResolvedValue(null);

      const result = await authService.refreshTokens('orphan-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('session_not_found');
      }
    });

    it('should return error for expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.findSessionByToken).mockResolvedValue(expiredSession);

      const result = await authService.refreshTokens('expired-session-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('session_expired');
      }
    });

    it('should blacklist old refresh token', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRepo.findSessionByToken).mockResolvedValue(mockSession);
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.createSession).mockResolvedValue(mockSession);

      await authService.refreshTokens('old-refresh-token');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:refresh:'),
        expect.any(Number),
        '1'
      );
    });

    it('should delete old session and create new one', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRepo.findSessionByToken).mockResolvedValue(mockSession);
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.createSession).mockResolvedValue(mockSession);

      await authService.refreshTokens('old-refresh-token');

      expect(mockRepo.deleteSession).toHaveBeenCalledWith(mockSession.id);
      expect(mockRepo.createSession).toHaveBeenCalledWith(
        mockTokenPayload.userId,
        'new-refresh-token',
        expect.any(Date),
        mockSession.userAgent,
        mockSession.ipAddress
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should return user for valid token', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(mockTokenPayload);
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.findUserById).mockResolvedValue(mockUser);

      const result = await authService.validateAccessToken('valid-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          name: null,
          emailVerified: mockUser.emailVerified,
        });
      }
    });

    it('should return error for blacklisted token', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(mockTokenPayload);
      vi.mocked(mockRedis.exists).mockResolvedValue(1);

      const result = await authService.validateAccessToken('blacklisted-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for invalid token signature', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(null);
      vi.mocked(tokenService.verifyToken).mockReturnValue(err('invalid_token' as const));

      const result = await authService.validateAccessToken('invalid-signature');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('invalid_token');
      }
    });

    it('should return error for expired token', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(null);
      vi.mocked(tokenService.verifyToken).mockReturnValue(err('expired_token' as const));

      const result = await authService.validateAccessToken('expired-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('expired_token');
      }
    });

    it('should return error for non-existent user', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(mockTokenPayload);
      vi.mocked(tokenService.verifyToken).mockReturnValue(ok(mockTokenPayload as TokenPayload));
      vi.mocked(mockRedis.exists).mockResolvedValue(0);
      vi.mocked(mockRepo.findUserById).mockResolvedValue(null);

      const result = await authService.validateAccessToken('valid-token-deleted-user');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('user_not_found');
      }
    });

    it('should check blacklist before verifying token', async () => {
      vi.mocked(tokenService.decodeToken).mockReturnValue(mockTokenPayload);
      vi.mocked(mockRedis.exists).mockResolvedValue(1);

      await authService.validateAccessToken('blacklisted-token');

      expect(mockRedis.exists).toHaveBeenCalledWith(`blacklist:${mockSession.id}`);
      expect(tokenService.verifyToken).not.toHaveBeenCalled();
    });
  });
});
