import type { Booking, Train } from '@eurostar/core/db';

/**
 * Status of a journey for delay monitoring purposes.
 */
export const JourneyStatus = {
  /** Journey date has not arrived yet */
  PENDING: 'pending',
  /** Journey is currently in progress */
  IN_PROGRESS: 'in_progress',
  /** Journey has completed (past scheduled arrival + buffer) */
  COMPLETED: 'completed',
  /** Cannot determine status (e.g., missing train data) */
  UNKNOWN: 'unknown',
} as const;

export type JourneyStatus = (typeof JourneyStatus)[keyof typeof JourneyStatus];

/**
 * Result of checking a journey's delay status.
 */
export interface DelayCheckResult {
  /** The booking that was checked */
  bookingId: string;
  /** Current journey status */
  status: JourneyStatus;
  /** Final delay in minutes (only set when COMPLETED) */
  delayMinutes: number | null;
  /** The matched train record (if found) */
  train: Train | null;
  /** Timestamp of the check */
  checkedAt: Date;
}

/**
 * Result of matching a booking to a train.
 */
export interface MatchResult {
  /** Whether a match was found */
  matched: boolean;
  /** The matched train (if found) */
  train: Train | null;
  /** Reason for no match (if not matched) */
  reason?: 'not_found' | 'date_mismatch' | 'train_number_mismatch';
}

/**
 * A completed booking with its final delay information.
 */
export interface CompletedBooking {
  booking: Booking;
  train: Train;
  delayMinutes: number;
  completedAt: Date;
}

/**
 * Result from processing bookings for delays.
 */
export interface ProcessingResult {
  /** Number of bookings processed */
  processed: number;
  /** Bookings that completed with delay info */
  completed: CompletedBooking[];
  /** Number of bookings skipped (train not found) */
  skipped: number;
  /** Number of bookings still in progress */
  inProgress: number;
  /** Any errors encountered */
  errors: Array<{ bookingId: string; error: string }>;
}

/**
 * Event emitted when a booking journey is completed with significant delay.
 */
export interface BookingCompletedEvent {
  bookingId: string;
  trainId: string;
  delayMinutes: number;
  isEligibleForClaim: boolean;
  completedAt: Date;
}
