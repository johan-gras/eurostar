import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  userPreferences,
  type UserPreference,
  type NewUserPreference,
  type SeatPreferences,
  type CompensationType,
  type Terminal,
} from '../db/schema.js';

/**
 * Data for updating user preferences.
 */
export interface UpdatePreferencesData {
  seatPreferences?: SeatPreferences | null | undefined;
  queueNotifications?: boolean | undefined;
  defaultTerminal?: Terminal | null | undefined;
  preferredCompensationType?: CompensationType | null | undefined;
}

/**
 * Preferences repository for user preferences database operations.
 */
export class PreferencesRepository {
  constructor(private db: Database) {}

  /**
   * Get preferences for a user.
   * Returns null if no preferences exist.
   */
  async findByUserId(userId: string): Promise<UserPreference | null> {
    const result = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Create preferences for a user.
   */
  async create(data: NewUserPreference): Promise<UserPreference> {
    const [preferences] = await this.db
      .insert(userPreferences)
      .values(data)
      .returning();

    if (!preferences) {
      throw new Error('Failed to create user preferences');
    }

    return preferences;
  }

  /**
   * Update preferences for a user.
   * Creates preferences if they don't exist.
   */
  async upsert(
    userId: string,
    data: UpdatePreferencesData
  ): Promise<UserPreference> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const [updated] = await this.db
        .update(userPreferences)
        .set(data)
        .where(eq(userPreferences.userId, userId))
        .returning();

      if (!updated) {
        throw new Error('Failed to update user preferences');
      }

      return updated;
    }

    return this.create({
      userId,
      ...data,
    });
  }

  /**
   * Delete preferences for a user.
   */
  async delete(userId: string): Promise<void> {
    await this.db
      .delete(userPreferences)
      .where(eq(userPreferences.userId, userId));
  }
}
