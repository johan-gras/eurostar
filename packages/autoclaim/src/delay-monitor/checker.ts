import type { Booking, Train } from '@eurostar/core/db';
import { JourneyStatus, type DelayCheckResult } from './types.js';

/**
 * Buffer time after scheduled arrival before considering journey complete.
 * Allows for late arrivals to be captured in the system.
 */
const COMPLETION_BUFFER_HOURS = 1;
const COMPLETION_BUFFER_MS = COMPLETION_BUFFER_HOURS * 60 * 60 * 1000;

/**
 * Minimum delay in minutes to be eligible for compensation.
 * Per Eurostar's compensation policy.
 */
export const COMPENSATION_THRESHOLD_MINUTES = 60;

/**
 * Determines if a journey is eligible for delay compensation.
 *
 * @param delayMinutes - The delay in minutes
 * @returns true if eligible for compensation
 */
export function isEligibleForCompensation(delayMinutes: number): boolean {
  return delayMinutes >= COMPENSATION_THRESHOLD_MINUTES;
}

/**
 * Calculates the delay in minutes from a train record.
 * Uses actual arrival vs scheduled arrival if available,
 * otherwise uses the stored delay_minutes field.
 *
 * @param train - The train record
 * @returns Delay in minutes, or 0 if no delay data
 */
export function calculateDelayMinutes(train: Train): number {
  // If we have actual arrival time, calculate from that
  if (train.actualArrival && train.scheduledArrival) {
    const diffMs =
      train.actualArrival.getTime() - train.scheduledArrival.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  }

  // Otherwise use the stored delay value
  return train.delayMinutes ?? 0;
}

/**
 * Checks the journey status for a booking based on train data.
 *
 * Journey states:
 * - PENDING: Journey date hasn't arrived yet
 * - IN_PROGRESS: Journey is happening now (between departure and arrival + buffer)
 * - COMPLETED: Journey has finished (past arrival + buffer)
 * - UNKNOWN: Cannot determine (usually when train data is missing)
 *
 * @param booking - The booking to check
 * @param train - The matched train record (may be null)
 * @param currentTime - Current time (defaults to now, injectable for testing)
 * @returns DelayCheckResult with status and delay info
 */
export function checkJourneyStatus(
  booking: Booking,
  train: Train | null,
  currentTime: Date = new Date()
): DelayCheckResult {
  const result: DelayCheckResult = {
    bookingId: booking.id,
    status: JourneyStatus.UNKNOWN,
    delayMinutes: null,
    train,
    checkedAt: currentTime,
  };

  // If no train data, we can still determine PENDING status from journey date
  if (!train) {
    const journeyStart = new Date(booking.journeyDate);
    journeyStart.setUTCHours(0, 0, 0, 0);

    if (currentTime < journeyStart) {
      result.status = JourneyStatus.PENDING;
    }
    // Otherwise status remains UNKNOWN - can't determine without train data

    return result;
  }

  // We have train data - use scheduled times
  const scheduledDeparture = train.scheduledDeparture;
  const scheduledArrival = train.scheduledArrival;
  const completionThreshold = new Date(
    scheduledArrival.getTime() + COMPLETION_BUFFER_MS
  );

  if (currentTime < scheduledDeparture) {
    // Before departure time
    result.status = JourneyStatus.PENDING;
  } else if (currentTime < completionThreshold) {
    // Between departure and arrival + buffer
    result.status = JourneyStatus.IN_PROGRESS;
  } else {
    // After arrival + buffer - journey is complete
    result.status = JourneyStatus.COMPLETED;
    result.delayMinutes = calculateDelayMinutes(train);
  }

  return result;
}

/**
 * Checks if a journey has completed based on train timing.
 *
 * @param train - The train record
 * @param currentTime - Current time (defaults to now)
 * @returns true if the journey is complete
 */
export function isJourneyComplete(
  train: Train,
  currentTime: Date = new Date()
): boolean {
  const completionThreshold = new Date(
    train.scheduledArrival.getTime() + COMPLETION_BUFFER_MS
  );
  return currentTime >= completionThreshold;
}

/**
 * Gets the completion buffer in milliseconds.
 * Exposed for testing purposes.
 */
export function getCompletionBufferMs(): number {
  return COMPLETION_BUFFER_MS;
}
