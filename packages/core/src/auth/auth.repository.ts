import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { users, sessions, type User, type Session } from '../db/schema.js';

/**
 * Auth repository for user and session database operations.
 */
export class AuthRepository {
  constructor(private db: Database) {}

  /**
   * Create a new user.
   */
  async createUser(
    email: string,
    passwordHash: string,
    _name?: string
  ): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  /**
   * Find a user by email address.
   */
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find a user by ID.
   */
  async findUserById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Update a user's password.
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));
  }

  /**
   * Create a new session.
   */
  async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    userAgent?: string,
    ip?: string
  ): Promise<Session> {
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId,
        token,
        expiresAt,
        userAgent,
        ipAddress: ip,
      })
      .returning();

    if (!session) {
      throw new Error('Failed to create session');
    }

    return session;
  }

  /**
   * Find a session by token.
   */
  async findSessionByToken(token: string): Promise<Session | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Delete a session by ID.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /**
   * Delete all sessions for a user.
   */
  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
