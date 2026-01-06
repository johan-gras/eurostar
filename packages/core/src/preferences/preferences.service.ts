import { Result, ok, err } from '../result.js';
import {
  PreferencesRepository,
  type UpdatePreferencesData,
} from './preferences.repository.js';
import type {
  UserPreference,
  SeatPreferences,
  CompensationType,
  Terminal,
} from '../db/schema.js';

/**
 * Preference service errors.
 */
export type PreferencesError = 'not_found' | 'invalid_seat_preferences';

/**
 * Default preferences when none exist.
 */
export const DEFAULT_PREFERENCES: Omit<
  UserPreference,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  seatPreferences: null,
  queueNotifications: true,
  defaultTerminal: null,
  preferredCompensationType: null,
};

/**
 * Valid values for seat preferences.
 */
const VALID_SEAT_POSITIONS = ['window', 'aisle', 'middle'] as const;
const VALID_SEAT_DIRECTIONS = ['forward', 'backward', 'any'] as const;
const VALID_COACH_TYPES = ['quiet', 'standard', 'any'] as const;

/**
 * Preferences service for managing user preferences.
 */
export class PreferencesService {
  constructor(private repository: PreferencesRepository) {}

  /**
   * Get preferences for a user.
   * Returns default preferences if none exist.
   */
  async getPreferences(
    userId: string
  ): Promise<Result<UserPreference, never>> {
    const preferences = await this.repository.findByUserId(userId);

    if (!preferences) {
      // Return default preferences with a placeholder structure
      return ok({
        id: '',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...DEFAULT_PREFERENCES,
      });
    }

    return ok(preferences);
  }

  /**
   * Update preferences for a user.
   * Validates seat preferences if provided.
   */
  async updatePreferences(
    userId: string,
    data: UpdatePreferencesData
  ): Promise<Result<UserPreference, PreferencesError>> {
    // Validate seat preferences if provided
    if (data.seatPreferences) {
      const validationResult = this.validateSeatPreferences(data.seatPreferences);
      if (validationResult.isErr()) {
        return err('invalid_seat_preferences');
      }
    }

    const preferences = await this.repository.upsert(userId, data);
    return ok(preferences);
  }

  /**
   * Reset preferences to defaults for a user.
   */
  async resetPreferences(
    userId: string
  ): Promise<Result<UserPreference, never>> {
    const preferences = await this.repository.upsert(userId, {
      seatPreferences: null,
      queueNotifications: true,
      defaultTerminal: null,
      preferredCompensationType: null,
    });

    return ok(preferences);
  }

  /**
   * Validate seat preferences structure.
   */
  private validateSeatPreferences(
    prefs: SeatPreferences
  ): Result<SeatPreferences, 'invalid'> {
    if (prefs.position && !VALID_SEAT_POSITIONS.includes(prefs.position)) {
      return err('invalid');
    }

    if (prefs.direction && !VALID_SEAT_DIRECTIONS.includes(prefs.direction)) {
      return err('invalid');
    }

    if (prefs.coach && !VALID_COACH_TYPES.includes(prefs.coach)) {
      return err('invalid');
    }

    if (prefs.table !== undefined && typeof prefs.table !== 'boolean') {
      return err('invalid');
    }

    if (prefs.powerSocket !== undefined && typeof prefs.powerSocket !== 'boolean') {
      return err('invalid');
    }

    return ok(prefs);
  }
}

export type { SeatPreferences, CompensationType, Terminal };
