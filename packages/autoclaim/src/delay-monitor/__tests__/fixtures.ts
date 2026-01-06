import type { Booking, Train, TrainType } from '@eurostar/core/db';

/**
 * Creates a mock booking for testing.
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
 * Creates a mock train for testing.
 */
export function createMockTrain(overrides: Partial<Train> = {}): Train {
  const date = new Date(Date.UTC(2026, 0, 5)); // Jan 5, 2026
  const scheduledDeparture = new Date(Date.UTC(2026, 0, 5, 8, 0)); // 08:00 UTC
  const scheduledArrival = new Date(Date.UTC(2026, 0, 5, 11, 0)); // 11:00 UTC

  return {
    id: 'train-001',
    tripId: '9007-0105',
    trainNumber: '9007',
    date,
    scheduledDeparture,
    scheduledArrival,
    actualArrival: null,
    delayMinutes: 0,
    trainType: 'e320' as TrainType,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a train with a specific delay.
 */
export function createDelayedTrain(delayMinutes: number, overrides: Partial<Train> = {}): Train {
  const base = createMockTrain(overrides);
  const actualArrival = new Date(base.scheduledArrival.getTime() + delayMinutes * 60 * 1000);

  return {
    ...base,
    actualArrival,
    delayMinutes,
    ...overrides,
  };
}

/**
 * Fixed date for testing - January 5, 2026 at 14:00 UTC.
 * This is after the train arrival (11:00) + 1 hour buffer (12:00).
 */
export const FIXED_TEST_DATE = new Date(Date.UTC(2026, 0, 5, 14, 0));

/**
 * Date before departure - January 5, 2026 at 07:00 UTC.
 */
export const BEFORE_DEPARTURE_DATE = new Date(Date.UTC(2026, 0, 5, 7, 0));

/**
 * Date during journey - January 5, 2026 at 09:00 UTC.
 */
export const DURING_JOURNEY_DATE = new Date(Date.UTC(2026, 0, 5, 9, 0));

/**
 * Date just after arrival but before buffer - January 5, 2026 at 11:30 UTC.
 */
export const AFTER_ARRIVAL_BEFORE_BUFFER = new Date(Date.UTC(2026, 0, 5, 11, 30));

/**
 * Test bookings for various scenarios.
 */
export const TEST_BOOKINGS = {
  /** Standard booking for train 9007 */
  standard: createMockBooking(),

  /** Booking with UK format train number (9O07 with letter O) */
  ukFormat: createMockBooking({
    id: 'booking-uk',
    trainNumber: '9O07', // Letter O instead of zero
  }),

  /** Booking for yesterday's journey */
  yesterday: createMockBooking({
    id: 'booking-yesterday',
    journeyDate: new Date(Date.UTC(2026, 0, 4)),
  }),

  /** Booking for tomorrow's journey */
  tomorrow: createMockBooking({
    id: 'booking-tomorrow',
    journeyDate: new Date(Date.UTC(2026, 0, 6)),
  }),

  /** Booking that already has final delay set */
  alreadyProcessed: createMockBooking({
    id: 'booking-processed',
    finalDelayMinutes: 75,
    trainId: 'train-001',
  }),

  /** Booking with different train number */
  differentTrain: createMockBooking({
    id: 'booking-diff',
    trainNumber: '9024',
  }),
};

/**
 * Test trains for various scenarios.
 */
export const TEST_TRAINS = {
  /** On-time train */
  onTime: createMockTrain(),

  /** Train with 30 minute delay (below compensation threshold) */
  minorDelay: createDelayedTrain(30, { id: 'train-minor' }),

  /** Train with 60 minute delay (at compensation threshold) */
  thresholdDelay: createDelayedTrain(60, { id: 'train-threshold' }),

  /** Train with 90 minute delay (above compensation threshold) */
  majorDelay: createDelayedTrain(90, { id: 'train-major' }),

  /** Train with 2+ hour delay */
  severeDelay: createDelayedTrain(150, { id: 'train-severe' }),

  /** Yesterday's train */
  yesterday: createMockTrain({
    id: 'train-yesterday',
    tripId: '9007-0104',
    date: new Date(Date.UTC(2026, 0, 4)),
    scheduledDeparture: new Date(Date.UTC(2026, 0, 4, 8, 0)),
    scheduledArrival: new Date(Date.UTC(2026, 0, 4, 11, 0)),
  }),
};
