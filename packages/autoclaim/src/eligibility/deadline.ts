import { CLAIM_WINDOW_HOURS, CLAIM_DEADLINE_MONTHS } from './types.js';

/**
 * Milliseconds in an hour.
 */
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Milliseconds in a day.
 */
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Checks if the claim window is open (24 hours have passed since journey).
 *
 * Per Eurostar policy, passengers must wait 24 hours after their journey
 * before submitting a compensation claim.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now, injectable for testing)
 * @returns true if 24+ hours have passed since the journey date
 *
 * @example
 * // Journey was yesterday
 * isClaimWindowOpen(yesterday) // true
 *
 * // Journey was 12 hours ago
 * isClaimWindowOpen(twelveHoursAgo) // false
 */
export function isClaimWindowOpen(
  journeyDate: Date,
  currentTime: Date = new Date()
): boolean {
  const windowOpenTime = getClaimWindowOpenTime(journeyDate);
  return currentTime >= windowOpenTime;
}

/**
 * Gets the time when the claim window opens (24 hours after journey).
 *
 * @param journeyDate - The date of the journey
 * @returns Date when claims can be submitted
 */
export function getClaimWindowOpenTime(journeyDate: Date): Date {
  return new Date(journeyDate.getTime() + CLAIM_WINDOW_HOURS * MS_PER_HOUR);
}

/**
 * Gets the hours remaining until the claim window opens.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now)
 * @returns Hours remaining (0 if window is already open)
 */
export function hoursUntilClaimWindowOpens(
  journeyDate: Date,
  currentTime: Date = new Date()
): number {
  const windowOpenTime = getClaimWindowOpenTime(journeyDate);
  const diffMs = windowOpenTime.getTime() - currentTime.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  return Math.ceil(diffMs / MS_PER_HOUR);
}

/**
 * Checks if the claim is within the 3-month deadline.
 *
 * Per Eurostar policy, claims must be submitted within 3 months
 * of the journey date.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now, injectable for testing)
 * @returns true if within the 3-month window
 *
 * @example
 * // Journey was 2 months ago
 * isWithinClaimWindow(twoMonthsAgo) // true
 *
 * // Journey was 4 months ago
 * isWithinClaimWindow(fourMonthsAgo) // false
 */
export function isWithinClaimWindow(
  journeyDate: Date,
  currentTime: Date = new Date()
): boolean {
  const deadline = getClaimDeadline(journeyDate);
  return currentTime <= deadline;
}

/**
 * Gets the claim deadline (3 months from journey date).
 *
 * @param journeyDate - The date of the journey
 * @returns The deadline date (end of day, 3 months from journey)
 *
 * @example
 * // Journey on January 15, 2026
 * getClaimDeadline(new Date('2026-01-15'))
 * // => April 15, 2026 23:59:59.999
 */
export function getClaimDeadline(journeyDate: Date): Date {
  const deadline = new Date(journeyDate);

  // Add 3 months
  deadline.setUTCMonth(deadline.getUTCMonth() + CLAIM_DEADLINE_MONTHS);

  // Set to end of day for more lenient deadline
  deadline.setUTCHours(23, 59, 59, 999);

  return deadline;
}

/**
 * Gets the number of days remaining until the claim deadline.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now)
 * @returns Days remaining (negative if past deadline)
 *
 * @example
 * // Journey was 2 months ago, deadline in 1 month
 * daysUntilDeadline(twoMonthsAgo) // ~30
 *
 * // Journey was 4 months ago, deadline passed
 * daysUntilDeadline(fourMonthsAgo) // -30 (approximately)
 */
export function daysUntilDeadline(
  journeyDate: Date,
  currentTime: Date = new Date()
): number {
  const deadline = getClaimDeadline(journeyDate);
  const diffMs = deadline.getTime() - currentTime.getTime();

  // For positive: floor (full days remaining)
  // For negative: floor (full days overdue, so -1 even if only 1 hour past)
  return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Checks if the deadline has passed.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now)
 * @returns true if the 3-month deadline has passed
 */
export function hasDeadlinePassed(
  journeyDate: Date,
  currentTime: Date = new Date()
): boolean {
  return !isWithinClaimWindow(journeyDate, currentTime);
}

/**
 * Gets a summary of the claim timing status.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now)
 * @returns Summary object with timing information
 */
export function getClaimTimingStatus(
  journeyDate: Date,
  currentTime: Date = new Date()
): {
  windowOpen: boolean;
  withinDeadline: boolean;
  canSubmit: boolean;
  deadline: Date;
  daysRemaining: number;
  hoursUntilWindowOpens: number;
} {
  const windowOpen = isClaimWindowOpen(journeyDate, currentTime);
  const withinDeadline = isWithinClaimWindow(journeyDate, currentTime);
  const deadline = getClaimDeadline(journeyDate);
  const daysRemaining = daysUntilDeadline(journeyDate, currentTime);
  const hoursUntilWindowOpens = hoursUntilClaimWindowOpens(journeyDate, currentTime);

  return {
    windowOpen,
    withinDeadline,
    canSubmit: windowOpen && withinDeadline,
    deadline,
    daysRemaining,
    hoursUntilWindowOpens,
  };
}

/**
 * Formats the time remaining until deadline for display.
 *
 * @param journeyDate - The date of the journey
 * @param currentTime - Current time (defaults to now)
 * @returns Human-readable string
 */
export function formatTimeUntilDeadline(
  journeyDate: Date,
  currentTime: Date = new Date()
): string {
  const days = daysUntilDeadline(journeyDate, currentTime);

  if (days < 0) {
    return `Expired ${Math.abs(days)} days ago`;
  }

  if (days === 0) {
    return 'Expires today';
  }

  if (days === 1) {
    return 'Expires tomorrow';
  }

  if (days < 7) {
    return `${days} days remaining`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks > 1 ? 's' : ''} remaining`;
  }

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} remaining`;
}
