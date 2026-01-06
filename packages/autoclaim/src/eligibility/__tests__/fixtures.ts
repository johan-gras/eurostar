import type { Booking } from '@eurostar/core/db';

/**
 * Creates a mock booking for eligibility testing.
 */
export function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  const journeyDate = new Date(Date.UTC(2026, 0, 5)); // Jan 5, 2026

  return {
    id: 'booking-001',
    userId: 'user-001',
    pnr: 'ABC123',
    tcn: 'IV123456789',
    trainId: null,
    trainNumber: '9007',
    journeyDate,
    origin: 'FRPLY',
    destination: 'GBSPX',
    passengerName: 'John Doe',
    coach: '5',
    seat: '23',
    finalDelayMinutes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Fixed test time: January 6, 2026 at 14:00 UTC (25 hours after journey).
 * This is after the 24-hour claim window opens.
 */
export const AFTER_WINDOW_OPENS = new Date(Date.UTC(2026, 0, 6, 14, 0));

/**
 * Test time: January 5, 2026 at 14:00 UTC (same day as journey).
 * This is before the 24-hour claim window opens.
 */
export const BEFORE_WINDOW_OPENS = new Date(Date.UTC(2026, 0, 5, 14, 0));

/**
 * Test time: April 6, 2026 (past 3-month deadline).
 * Journey was Jan 5, deadline is April 5.
 */
export const AFTER_DEADLINE = new Date(Date.UTC(2026, 3, 6, 14, 0));

/**
 * Test time: March 1, 2026 (within deadline, ~2 months after journey).
 */
export const WITHIN_DEADLINE = new Date(Date.UTC(2026, 2, 1, 14, 0));

/**
 * Delay boundaries for testing tier transitions.
 */
export const DELAY_BOUNDARIES = {
  /** Just below compensation threshold */
  BELOW_THRESHOLD: 59,
  /** At threshold (Standard tier begins) */
  AT_THRESHOLD: 60,
  /** Within Standard tier */
  STANDARD_MID: 90,
  /** Just below Extended tier */
  STANDARD_MAX: 119,
  /** At Extended tier boundary */
  EXTENDED_START: 120,
  /** Within Extended tier */
  EXTENDED_MID: 150,
  /** Just below Severe tier */
  EXTENDED_MAX: 179,
  /** At Severe tier boundary */
  SEVERE_START: 180,
  /** Within Severe tier */
  SEVERE_MID: 240,
  /** Very long delay */
  SEVERE_HIGH: 300,
};

/**
 * Standard ticket prices for testing.
 */
export const TICKET_PRICES = {
  /** Low price that may fall below minimum */
  LOW: 10,
  /** Medium price */
  MEDIUM: 100,
  /** High price */
  HIGH: 250,
  /** Very low price (always below minimum) */
  VERY_LOW: 5,
};

/**
 * Expected compensation for €100 ticket at each tier.
 */
export const EXPECTED_COMPENSATION_EUR_100 = {
  STANDARD: { cash: 25, voucher: 60 },
  EXTENDED: { cash: 50, voucher: 60 },
  SEVERE: { cash: 50, voucher: 75 },
};
