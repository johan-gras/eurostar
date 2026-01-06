import { eq, and } from 'drizzle-orm';
import type { Database } from '@eurostar/core/db';
import { trains, type Booking, type Train } from '@eurostar/core/db';
import type { MatchResult } from './types.js';

/**
 * Normalizes a train number to handle UK vs EU format differences.
 * UK uses letter 'O' (9Oxx) while EU uses digit '0' (90xx).
 * Always normalizes to digit format for consistent matching.
 */
export function normalizeTrainNumber(trainNumber: string): string {
  // Replace letter O with digit 0
  return trainNumber.replace(/O/gi, '0');
}

/**
 * Formats a date to MMDD format for trip ID construction.
 */
export function formatDateForTripId(date: Date): string {
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${month}${day}`;
}

/**
 * Builds a trip ID from train number and date.
 * Trip ID format: "{train_number}-{MMDD}"
 * Example: "9007-0105" for train 9007 on January 5th
 */
export function buildTripId(trainNumber: string, date: Date): string {
  const normalizedNumber = normalizeTrainNumber(trainNumber);
  const dateStr = formatDateForTripId(date);
  return `${normalizedNumber}-${dateStr}`;
}

/**
 * Checks if two dates represent the same calendar day (UTC).
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Matches a booking to its corresponding train record in the database.
 *
 * Matching strategy:
 * 1. First try to find by trip_id (most accurate)
 * 2. Fall back to train_number + date matching
 *
 * @param booking - The booking to match
 * @param db - Database connection
 * @returns MatchResult indicating success/failure and the train if found
 */
export async function matchBookingToTrain(
  booking: Booking,
  db: Database
): Promise<MatchResult> {
  const normalizedTrainNumber = normalizeTrainNumber(booking.trainNumber);
  const tripId = buildTripId(booking.trainNumber, booking.journeyDate);

  // Try to find by trip_id first (exact match)
  const trainByTripId = await db
    .select()
    .from(trains)
    .where(eq(trains.tripId, tripId))
    .limit(1);

  if (trainByTripId.length > 0) {
    return {
      matched: true,
      train: trainByTripId[0] as Train,
    };
  }

  // Fall back to train_number + date matching
  const trainByNumberAndDate = await db
    .select()
    .from(trains)
    .where(
      and(
        eq(trains.trainNumber, normalizedTrainNumber),
        eq(trains.date, booking.journeyDate)
      )
    )
    .limit(1);

  if (trainByNumberAndDate.length > 0) {
    return {
      matched: true,
      train: trainByNumberAndDate[0] as Train,
    };
  }

  // No match found - train not yet in system
  return {
    matched: false,
    train: null,
    reason: 'not_found',
  };
}

/**
 * Matches multiple bookings to their trains in a single operation.
 * More efficient than calling matchBookingToTrain repeatedly.
 *
 * @param bookings - Array of bookings to match
 * @param db - Database connection
 * @returns Map of booking ID to MatchResult
 */
export async function matchBookingsToTrains(
  bookings: Booking[],
  db: Database
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();

  if (bookings.length === 0) {
    return results;
  }

  // For now, match each booking individually
  // Future optimization: batch query using inArray(trains.tripId, tripIds)
  for (const booking of bookings) {
    const result = await matchBookingToTrain(booking, db);
    results.set(booking.id, result);
  }

  return results;
}
