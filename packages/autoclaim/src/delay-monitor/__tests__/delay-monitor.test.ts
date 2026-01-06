import { describe, it, expect } from 'vitest';
import {
  normalizeTrainNumber,
  formatDateForTripId,
  buildTripId,
  isSameDay,
} from '../matcher.js';
import {
  checkJourneyStatus,
  calculateDelayMinutes,
  isEligibleForCompensation,
  isJourneyComplete,
  COMPENSATION_THRESHOLD_MINUTES,
} from '../checker.js';
import { JourneyStatus } from '../types.js';
import {
  createMockBooking,
  createMockTrain,
  createDelayedTrain,
  FIXED_TEST_DATE,
  BEFORE_DEPARTURE_DATE,
  DURING_JOURNEY_DATE,
  AFTER_ARRIVAL_BEFORE_BUFFER,
  TEST_BOOKINGS,
  TEST_TRAINS,
} from './fixtures.js';

describe('Matcher', () => {
  describe('normalizeTrainNumber', () => {
    // Test 1: UK format normalization
    it('normalizes UK format train numbers (letter O to digit 0)', () => {
      expect(normalizeTrainNumber('9O07')).toBe('9007');
      expect(normalizeTrainNumber('9O24')).toBe('9024');
    });

    // Test 2: EU format preservation
    it('preserves EU format train numbers', () => {
      expect(normalizeTrainNumber('9007')).toBe('9007');
      expect(normalizeTrainNumber('9024')).toBe('9024');
    });

    // Test 3: Mixed case handling
    it('handles lowercase o in train numbers', () => {
      expect(normalizeTrainNumber('9o07')).toBe('9007');
    });
  });

  describe('formatDateForTripId', () => {
    // Test 4: Date formatting
    it('formats dates as MMDD', () => {
      expect(formatDateForTripId(new Date(Date.UTC(2026, 0, 5)))).toBe('0105');
      expect(formatDateForTripId(new Date(Date.UTC(2026, 11, 25)))).toBe('1225');
      expect(formatDateForTripId(new Date(Date.UTC(2026, 6, 15)))).toBe('0715');
    });
  });

  describe('buildTripId', () => {
    // Test 5: Trip ID construction
    it('builds correct trip IDs from train number and date', () => {
      expect(buildTripId('9007', new Date(Date.UTC(2026, 0, 5)))).toBe('9007-0105');
      expect(buildTripId('9024', new Date(Date.UTC(2026, 11, 25)))).toBe('9024-1225');
    });

    // Test 6: UK format in trip ID
    it('normalizes UK format when building trip IDs', () => {
      expect(buildTripId('9O07', new Date(Date.UTC(2026, 0, 5)))).toBe('9007-0105');
    });
  });

  describe('isSameDay', () => {
    // Test 7: Same day comparison
    it('returns true for same calendar day', () => {
      const date1 = new Date(Date.UTC(2026, 0, 5, 8, 0));
      const date2 = new Date(Date.UTC(2026, 0, 5, 20, 0));
      expect(isSameDay(date1, date2)).toBe(true);
    });

    // Test 8: Different day comparison
    it('returns false for different calendar days', () => {
      const date1 = new Date(Date.UTC(2026, 0, 5, 23, 59));
      const date2 = new Date(Date.UTC(2026, 0, 6, 0, 1));
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });
});

describe('Checker', () => {
  describe('checkJourneyStatus', () => {
    // Test 9: Journey complete status
    it('returns COMPLETED status when past arrival + buffer', () => {
      const booking = createMockBooking();
      const train = createMockTrain();

      const result = checkJourneyStatus(booking, train, FIXED_TEST_DATE);

      expect(result.status).toBe(JourneyStatus.COMPLETED);
      expect(result.delayMinutes).toBe(0);
    });

    // Test 10: Journey pending status
    it('returns PENDING status before departure', () => {
      const booking = createMockBooking();
      const train = createMockTrain();

      const result = checkJourneyStatus(booking, train, BEFORE_DEPARTURE_DATE);

      expect(result.status).toBe(JourneyStatus.PENDING);
      expect(result.delayMinutes).toBeNull();
    });

    // Test 11: Journey in progress status
    it('returns IN_PROGRESS status during journey', () => {
      const booking = createMockBooking();
      const train = createMockTrain();

      const result = checkJourneyStatus(booking, train, DURING_JOURNEY_DATE);

      expect(result.status).toBe(JourneyStatus.IN_PROGRESS);
      expect(result.delayMinutes).toBeNull();
    });

    // Test 12: In progress during buffer period
    it('returns IN_PROGRESS during buffer period after arrival', () => {
      const booking = createMockBooking();
      const train = createMockTrain();

      const result = checkJourneyStatus(booking, train, AFTER_ARRIVAL_BEFORE_BUFFER);

      expect(result.status).toBe(JourneyStatus.IN_PROGRESS);
    });

    // Test 13: No train data pending
    it('returns PENDING when no train and journey date is in future', () => {
      const booking = createMockBooking({
        journeyDate: new Date(Date.UTC(2026, 0, 10)),
      });
      const testTime = new Date(Date.UTC(2026, 0, 5));

      const result = checkJourneyStatus(booking, null, testTime);

      expect(result.status).toBe(JourneyStatus.PENDING);
    });

    // Test 14: No train data unknown
    it('returns UNKNOWN when no train and journey date has passed', () => {
      const booking = createMockBooking();
      const testTime = FIXED_TEST_DATE;

      const result = checkJourneyStatus(booking, null, testTime);

      expect(result.status).toBe(JourneyStatus.UNKNOWN);
    });
  });

  describe('calculateDelayMinutes', () => {
    // Test 15: Delay from actual arrival
    it('calculates delay from actual arrival time', () => {
      const train = createDelayedTrain(90);
      expect(calculateDelayMinutes(train)).toBe(90);
    });

    // Test 16: Zero delay
    it('returns 0 for on-time trains', () => {
      const train = createMockTrain();
      expect(calculateDelayMinutes(train)).toBe(0);
    });

    // Test 17: Falls back to delayMinutes field
    it('uses delayMinutes field when no actual arrival', () => {
      const train = createMockTrain({ delayMinutes: 45 });
      expect(calculateDelayMinutes(train)).toBe(45);
    });
  });

  describe('isEligibleForCompensation', () => {
    // Test 18: Below threshold
    it('returns false for delays below 60 minutes', () => {
      expect(isEligibleForCompensation(30)).toBe(false);
      expect(isEligibleForCompensation(59)).toBe(false);
    });

    // Test 19: At threshold
    it('returns true for delays at 60 minutes', () => {
      expect(isEligibleForCompensation(60)).toBe(true);
    });

    // Test 20: Above threshold
    it('returns true for delays above 60 minutes', () => {
      expect(isEligibleForCompensation(90)).toBe(true);
      expect(isEligibleForCompensation(150)).toBe(true);
    });

    // Test 21: Threshold constant
    it('has correct compensation threshold', () => {
      expect(COMPENSATION_THRESHOLD_MINUTES).toBe(60);
    });
  });

  describe('isJourneyComplete', () => {
    // Test 22: Complete journey
    it('returns true when past arrival + buffer', () => {
      const train = createMockTrain();
      expect(isJourneyComplete(train, FIXED_TEST_DATE)).toBe(true);
    });

    // Test 23: Incomplete journey
    it('returns false when before arrival + buffer', () => {
      const train = createMockTrain();
      expect(isJourneyComplete(train, DURING_JOURNEY_DATE)).toBe(false);
      expect(isJourneyComplete(train, AFTER_ARRIVAL_BEFORE_BUFFER)).toBe(false);
    });
  });
});

describe('DelayCheckResult', () => {
  // Test 24: Result includes all fields
  it('includes all required fields in result', () => {
    const booking = createMockBooking();
    const train = createDelayedTrain(75);

    const result = checkJourneyStatus(booking, train, FIXED_TEST_DATE);

    expect(result).toMatchObject({
      bookingId: booking.id,
      status: JourneyStatus.COMPLETED,
      delayMinutes: 75,
      train,
    });
    expect(result.checkedAt).toBeInstanceOf(Date);
  });
});

describe('Integration scenarios', () => {
  // Test 25: Delayed train completion
  it('correctly identifies eligible delayed booking', () => {
    const booking = createMockBooking();
    const train = createDelayedTrain(90);

    const result = checkJourneyStatus(booking, train, FIXED_TEST_DATE);

    expect(result.status).toBe(JourneyStatus.COMPLETED);
    expect(result.delayMinutes).toBe(90);
    expect(isEligibleForCompensation(result.delayMinutes!)).toBe(true);
  });

  // Test 26: Minor delay not eligible
  it('correctly identifies non-eligible minor delay', () => {
    const booking = createMockBooking();
    const train = createDelayedTrain(30);

    const result = checkJourneyStatus(booking, train, FIXED_TEST_DATE);

    expect(result.status).toBe(JourneyStatus.COMPLETED);
    expect(result.delayMinutes).toBe(30);
    expect(isEligibleForCompensation(result.delayMinutes!)).toBe(false);
  });

  // Test 27: UK format booking matches train
  it('UK format train number matches normalized train', () => {
    const ukBooking = TEST_BOOKINGS.ukFormat;
    const tripId = buildTripId(ukBooking.trainNumber, ukBooking.journeyDate);

    expect(tripId).toBe('9007-0105');
    expect(tripId).toBe(TEST_TRAINS.onTime.tripId);
  });
});
