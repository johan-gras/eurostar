import type { Booking } from '@eurostar/core/db';
import {
  Currency,
  EligibilityReason,
  MINIMUM_DELAY_MINUTES,
  type EligibilityStatus,
} from './types.js';
import { calculateCompensationDetailed } from './calculator.js';
import { isDelayCompensable } from './tiers.js';
import {
  isClaimWindowOpen,
  isWithinClaimWindow,
  getClaimDeadline,
  daysUntilDeadline,
} from './deadline.js';

/**
 * Options for eligibility checking.
 */
export interface CheckEligibilityOptions {
  /** Current time for timing checks (defaults to now) */
  currentTime?: Date;
  /** Currency for compensation calculation (defaults to EUR) */
  currency?: Currency;
}

/**
 * Service for checking compensation eligibility.
 *
 * Combines all eligibility checks:
 * - Delay threshold (>= 60 minutes)
 * - Claim window open (24h after journey)
 * - Within deadline (< 3 months)
 * - Above minimum payout (>= €4/£4)
 */
export class EligibilityService {
  /**
   * Checks if a booking is eligible for compensation.
   *
   * Performs all eligibility checks and returns a comprehensive status
   * including the reason for eligibility/ineligibility and compensation amounts.
   *
   * @param booking - The booking to check
   * @param delayMinutes - The delay in minutes
   * @param ticketPrice - The ticket price
   * @param options - Optional configuration
   * @returns Full eligibility status
   *
   * @example
   * const service = new EligibilityService();
   * const status = service.checkEligibility(booking, 90, 100);
   * if (status.eligible) {
   *   console.log(`Cash: €${status.compensation?.cashAmount}`);
   * }
   */
  checkEligibility(
    booking: Booking,
    delayMinutes: number,
    ticketPrice: number,
    options: CheckEligibilityOptions = {}
  ): EligibilityStatus {
    const currentTime = options.currentTime ?? new Date();
    const currency = options.currency ?? Currency.EUR;
    const failedChecks: EligibilityReason[] = [];

    // Check 1: Is delay sufficient? (>= 60 min)
    const delaySufficient = isDelayCompensable(delayMinutes);
    if (!delaySufficient) {
      failedChecks.push(EligibilityReason.INSUFFICIENT_DELAY);
    }

    // Check 2: Is claim window open? (24h passed)
    const windowOpen = isClaimWindowOpen(booking.journeyDate, currentTime);
    if (!windowOpen) {
      failedChecks.push(EligibilityReason.CLAIM_WINDOW_NOT_OPEN);
    }

    // Check 3: Is within deadline? (< 3 months)
    const withinDeadline = isWithinClaimWindow(booking.journeyDate, currentTime);
    if (!withinDeadline) {
      failedChecks.push(EligibilityReason.DEADLINE_EXPIRED);
    }

    // Calculate compensation (even if not eligible, for reference)
    const compensation = calculateCompensationDetailed(
      delayMinutes,
      ticketPrice,
      currency
    );

    // Check 4: Is above minimum payout?
    if (delaySufficient && !compensation.eligible) {
      failedChecks.push(EligibilityReason.BELOW_MINIMUM_PAYOUT);
    }

    // Determine overall eligibility
    const eligible = failedChecks.length === 0;
    const reason = eligible
      ? EligibilityReason.ELIGIBLE
      : failedChecks[0]!; // Primary reason is first failed check

    return {
      eligible,
      reason,
      failedChecks,
      compensation: eligible ? compensation : null,
      deadline: getClaimDeadline(booking.journeyDate),
      daysUntilDeadline: daysUntilDeadline(booking.journeyDate, currentTime),
      claimWindowOpen: windowOpen,
    };
  }

  /**
   * Checks eligibility using booking data only (when delay is already known).
   *
   * Uses booking.finalDelayMinutes if available.
   *
   * @param booking - The booking with finalDelayMinutes set
   * @param ticketPrice - The ticket price
   * @param options - Optional configuration
   * @returns Full eligibility status or null if no delay data
   */
  checkEligibilityFromBooking(
    booking: Booking,
    ticketPrice: number,
    options: CheckEligibilityOptions = {}
  ): EligibilityStatus | null {
    if (booking.finalDelayMinutes === null) {
      return null;
    }

    return this.checkEligibility(
      booking,
      booking.finalDelayMinutes,
      ticketPrice,
      options
    );
  }

  /**
   * Quick check if a delay qualifies for compensation.
   * Does not check timing or minimum payout.
   *
   * @param delayMinutes - The delay in minutes
   * @returns true if delay >= 60 minutes
   */
  isDelayEligible(delayMinutes: number): boolean {
    return delayMinutes >= MINIMUM_DELAY_MINUTES;
  }

  /**
   * Quick check if a booking can be claimed now.
   * Checks timing constraints only, not delay or payout.
   *
   * @param booking - The booking to check
   * @param currentTime - Current time (defaults to now)
   * @returns true if within claim window and before deadline
   */
  canClaimNow(booking: Booking, currentTime: Date = new Date()): boolean {
    const windowOpen = isClaimWindowOpen(booking.journeyDate, currentTime);
    const withinDeadline = isWithinClaimWindow(booking.journeyDate, currentTime);
    return windowOpen && withinDeadline;
  }
}

/**
 * Creates a new EligibilityService instance.
 */
export function createEligibilityService(): EligibilityService {
  return new EligibilityService();
}

/**
 * Convenience function to check eligibility without creating a service instance.
 *
 * @param booking - The booking to check
 * @param delayMinutes - The delay in minutes
 * @param ticketPrice - The ticket price
 * @param options - Optional configuration
 * @returns Full eligibility status
 */
export function checkEligibility(
  booking: Booking,
  delayMinutes: number,
  ticketPrice: number,
  options: CheckEligibilityOptions = {}
): EligibilityStatus {
  const service = new EligibilityService();
  return service.checkEligibility(booking, delayMinutes, ticketPrice, options);
}
