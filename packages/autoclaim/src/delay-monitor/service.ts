import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '@eurostar/core/db';
import { bookings, type Booking } from '@eurostar/core/db';
import { matchBookingToTrain } from './matcher.js';
import {
  checkJourneyStatus,
  isEligibleForCompensation,
} from './checker.js';
import {
  JourneyStatus,
  type ProcessingResult,
  type CompletedBooking,
  type BookingCompletedEvent,
} from './types.js';

export type BookingCompletedHandler = (event: BookingCompletedEvent) => void | Promise<void>;

/**
 * Service for monitoring booking delays and detecting completed journeys.
 *
 * The delay monitor:
 * 1. Queries unprocessed bookings (journey today/yesterday, no final_delay_minutes)
 * 2. Matches each booking to its train record
 * 3. Checks if the journey is complete
 * 4. Updates final_delay_minutes for completed journeys
 * 5. Emits events for bookings eligible for compensation
 */
export class DelayMonitorService {
  private readonly onBookingCompleted: BookingCompletedHandler | null;

  constructor(options: { onBookingCompleted?: BookingCompletedHandler } = {}) {
    this.onBookingCompleted = options.onBookingCompleted ?? null;
  }

  /**
   * Processes bookings to detect completed journeys and calculate final delays.
   *
   * @param db - Database connection
   * @param currentTime - Current time (defaults to now, injectable for testing)
   * @returns ProcessingResult with summary of what was processed
   */
  async processBookings(
    db: Database,
    currentTime: Date = new Date()
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      completed: [],
      skipped: 0,
      inProgress: 0,
      errors: [],
    };

    // Get bookings that need checking:
    // - Journey date is today or yesterday
    // - final_delay_minutes is NULL (not yet processed)
    const pendingBookings = await this.getPendingBookings(db, currentTime);
    result.processed = pendingBookings.length;

    if (pendingBookings.length === 0) {
      return result;
    }

    // Process each booking
    for (const booking of pendingBookings) {
      try {
        const completed = await this.processBooking(booking, db, currentTime);

        if (completed) {
          result.completed.push(completed);
        } else {
          // Check if skipped (no train) or in progress
          const matchResult = await matchBookingToTrain(booking, db);
          if (!matchResult.matched) {
            result.skipped++;
          } else {
            result.inProgress++;
          }
        }
      } catch (error) {
        result.errors.push({
          bookingId: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Gets bookings that need delay checking.
   * Queries for bookings where:
   * - journey_date is within the check window (yesterday to today)
   * - final_delay_minutes is NULL
   */
  private async getPendingBookings(
    db: Database,
    currentTime: Date
  ): Promise<Booking[]> {
    // Calculate date range: yesterday and today
    const today = new Date(currentTime);
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // Query for unprocessed bookings in the date range
    const pendingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          isNull(bookings.finalDelayMinutes),
          gte(bookings.journeyDate, yesterday),
          lte(bookings.journeyDate, today)
        )
      );

    return pendingBookings;
  }

  /**
   * Processes a single booking to check for completion.
   *
   * @returns CompletedBooking if the journey completed, null otherwise
   */
  private async processBooking(
    booking: Booking,
    db: Database,
    currentTime: Date
  ): Promise<CompletedBooking | null> {
    // Try to match to a train
    const matchResult = await matchBookingToTrain(booking, db);

    if (!matchResult.matched || !matchResult.train) {
      // Train not in system yet - skip and retry later
      return null;
    }

    // Check journey status
    const checkResult = checkJourneyStatus(booking, matchResult.train, currentTime);

    if (checkResult.status !== JourneyStatus.COMPLETED) {
      // Journey not complete yet
      return null;
    }

    const delayMinutes = checkResult.delayMinutes ?? 0;

    // Update the booking with final delay
    await db
      .update(bookings)
      .set({
        finalDelayMinutes: delayMinutes,
        trainId: matchResult.train.id,
      })
      .where(eq(bookings.id, booking.id));

    const completedBooking: CompletedBooking = {
      booking,
      train: matchResult.train,
      delayMinutes,
      completedAt: currentTime,
    };

    // Emit event for eligible bookings
    if (this.onBookingCompleted) {
      const event: BookingCompletedEvent = {
        bookingId: booking.id,
        trainId: matchResult.train.id,
        delayMinutes,
        isEligibleForClaim: isEligibleForCompensation(delayMinutes),
        completedAt: currentTime,
      };

      await this.onBookingCompleted(event);
    }

    return completedBooking;
  }

  /**
   * Gets statistics about pending bookings.
   * Useful for monitoring and dashboards.
   */
  async getStats(
    db: Database,
    currentTime: Date = new Date()
  ): Promise<{
    pendingCount: number;
    processedTodayCount: number;
    eligibleClaimsCount: number;
  }> {
    const today = new Date(currentTime);
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // Count pending bookings
    const pendingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(
          isNull(bookings.finalDelayMinutes),
          gte(bookings.journeyDate, yesterday),
          lte(bookings.journeyDate, today)
        )
      );

    // Count processed today
    const processedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(
          sql`${bookings.finalDelayMinutes} IS NOT NULL`,
          gte(bookings.journeyDate, yesterday),
          lte(bookings.journeyDate, today)
        )
      );

    // Count eligible claims (delay >= 60 min)
    const eligibleResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        and(
          gte(bookings.finalDelayMinutes, 60),
          gte(bookings.journeyDate, yesterday),
          lte(bookings.journeyDate, today)
        )
      );

    return {
      pendingCount: Number(pendingResult[0]?.count ?? 0),
      processedTodayCount: Number(processedResult[0]?.count ?? 0),
      eligibleClaimsCount: Number(eligibleResult[0]?.count ?? 0),
    };
  }
}

/**
 * Creates a new DelayMonitorService instance.
 */
export function createDelayMonitorService(
  options: { onBookingCompleted?: BookingCompletedHandler } = {}
): DelayMonitorService {
  return new DelayMonitorService(options);
}
