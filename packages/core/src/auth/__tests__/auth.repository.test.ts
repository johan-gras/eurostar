import { describe, it, expect, vi } from 'vitest';
import { AuthRepository } from '../auth.repository.js';
import type { Database } from '../../db/index.js';
import type { User, Session } from '../../db/schema.js';

// Mock user data
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  emailVerified: false,
  verificationToken: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

// Mock session data
const mockSession: Session = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  userId: mockUser.id,
  token: 'session-token-abc123',
  expiresAt: new Date('2024-01-02T00:00:00Z'),
  userAgent: 'Mozilla/5.0',
  ipAddress: '192.168.1.1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

// Create mock database
function createMockDb() {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockUpdateWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  const db = {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  } as unknown as Database;

  return {
    db,
    mocks: {
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      update: mockUpdate,
      set: mockSet,
      updateWhere: mockUpdateWhere,
      delete: mockDelete,
      deleteWhere: mockDeleteWhere,
    },
  };
}

describe('AuthRepository', () => {
  describe('createUser', () => {
    it('should create a user and return it', async () => {
      const { db, mocks } = createMockDb();
      mocks.returning.mockResolvedValue([mockUser]);

      const repo = new AuthRepository(db);
      const result = await repo.createUser('test@example.com', 'hashed-pwd');

      expect(result).toEqual(mockUser);
      expect(mocks.insert).toHaveBeenCalled();
      expect(mocks.values).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashed-pwd',
      });
    });
  });

  describe('findUserByEmail', () => {
    it('should return user when found', async () => {
      const { db, mocks } = createMockDb();
      mocks.limit.mockResolvedValue([mockUser]);

      const repo = new AuthRepository(db);
      const result = await repo.findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mocks.select).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      const { db, mocks } = createMockDb();
      mocks.limit.mockResolvedValue([]);

      const repo = new AuthRepository(db);
      const result = await repo.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      const { db, mocks } = createMockDb();
      mocks.limit.mockResolvedValue([mockUser]);

      const repo = new AuthRepository(db);
      const result = await repo.findUserById(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const { db, mocks } = createMockDb();
      mocks.limit.mockResolvedValue([]);

      const repo = new AuthRepository(db);
      const result = await repo.findUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update the password hash', async () => {
      const { db, mocks } = createMockDb();
      mocks.updateWhere.mockResolvedValue(undefined);

      const repo = new AuthRepository(db);
      await repo.updatePassword(mockUser.id, 'new-hashed-password');

      expect(mocks.update).toHaveBeenCalled();
      expect(mocks.set).toHaveBeenCalledWith({
        passwordHash: 'new-hashed-password',
      });
    });
  });

  describe('createSession', () => {
    it('should create a session with all fields', async () => {
      const { db, mocks } = createMockDb();
      mocks.returning.mockResolvedValue([mockSession]);

      const repo = new AuthRepository(db);
      const expiresAt = new Date('2024-01-02T00:00:00Z');
      const result = await repo.createSession(
        mockUser.id,
        'session-token-abc123',
        expiresAt,
        'Mozilla/5.0',
        '192.168.1.1'
      );

      expect(result).toEqual(mockSession);
      expect(mocks.values).toHaveBeenCalledWith({
        userId: mockUser.id,
        token: 'session-token-abc123',
        expiresAt,
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });
    });

    it('should create a session without optional fields', async () => {
      const { db, mocks } = createMockDb();
      const sessionWithoutOptional = { ...mockSession, userAgent: null, ipAddress: null };
      mocks.returning.mockResolvedValue([sessionWithoutOptional]);

      const repo = new AuthRepository(db);
      const expiresAt = new Date('2024-01-02T00:00:00Z');
      const result = await repo.createSession(
        mockUser.id,
        'session-token-abc123',
        expiresAt
      );

      expect(result).toEqual(sessionWithoutOptional);
      expect(mocks.values).toHaveBeenCalledWith({
        userId: mockUser.id,
        token: 'session-token-abc123',
        expiresAt,
        userAgent: undefined,
        ipAddress: undefined,
      });
    });
  });

  describe('findSessionByToken', () => {
    it('should return session when found', async () => {
      const { db, mocks } = createMockDb();
      mocks.limit.mockResolvedValue([mockSession]);

      const repo = new AuthRepository(db);
      const result = await repo.findSessionByToken('session-token-abc123');

      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const { db, mocks } = createMockDb();
      mocks.limit.mockResolvedValue([]);

      const repo = new AuthRepository(db);
      const result = await repo.findSessionByToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session by id', async () => {
      const { db, mocks } = createMockDb();
      mocks.deleteWhere.mockResolvedValue(undefined);

      const repo = new AuthRepository(db);
      await repo.deleteSession(mockSession.id);

      expect(mocks.delete).toHaveBeenCalled();
      expect(mocks.deleteWhere).toHaveBeenCalled();
    });
  });

  describe('deleteUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      const { db, mocks } = createMockDb();
      mocks.deleteWhere.mockResolvedValue(undefined);

      const repo = new AuthRepository(db);
      await repo.deleteUserSessions(mockUser.id);

      expect(mocks.delete).toHaveBeenCalled();
      expect(mocks.deleteWhere).toHaveBeenCalled();
    });
  });
});
