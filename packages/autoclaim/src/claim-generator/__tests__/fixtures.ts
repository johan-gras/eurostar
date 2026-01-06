/**
 * Test fixtures for claim generator tests.
 */

import type { Booking, Claim } from '@eurostar/core/db';
import type { EligibilityStatus, CompensationResult } from '../../eligibility/types.js';
import { EligibilityReason, Currency } from '../../eligibility/types.js';

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
    trainId: 'train-001',
    trainNumber: '9007',
    journeyDate,
    origin: 'FRPLY',
    destination: 'GBSPX',
    passengerName: 'John Doe',
    coach: '5',
    seat: '23',
    finalDelayMinutes: 90,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock claim for testing.
 */
export function createMockClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-001',
    bookingId: 'booking-001',
    delayMinutes: 90,
    eligibleCashAmount: '25.00',
    eligibleVoucherAmount: '60.00',
    status: 'eligible',
    submittedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock compensation result.
 */
export function createMockCompensationResult(
  overrides: Partial<CompensationResult> = {}
): CompensationResult {
  return {
    eligible: true,
    cashAmount: 25,
    voucherAmount: 60,
    tier: {
      minDelayMinutes: 60,
      maxDelayMinutes: 120,
      cashPercentage: 0.25,
      voucherPercentage: 0.6,
      name: 'Standard',
    },
    currency: Currency.EUR,
    ticketPrice: 100,
    delayMinutes: 90,
    ...overrides,
  };
}

/**
 * Creates a mock eligibility status for an eligible booking.
 */
export function createMockEligibilityStatus(
  overrides: Partial<EligibilityStatus> = {}
): EligibilityStatus {
  return {
    eligible: true,
    reason: EligibilityReason.ELIGIBLE,
    failedChecks: [],
    compensation: createMockCompensationResult(),
    deadline: new Date(Date.UTC(2026, 3, 5)), // April 5, 2026
    daysUntilDeadline: 90,
    claimWindowOpen: true,
    ...overrides,
  };
}

/**
 * Creates an ineligible eligibility status.
 */
export function createIneligibleStatus(
  reason: typeof EligibilityReason[keyof typeof EligibilityReason] = EligibilityReason.INSUFFICIENT_DELAY
): EligibilityStatus {
  return {
    eligible: false,
    reason,
    failedChecks: [reason],
    compensation: null,
    deadline: new Date(Date.UTC(2026, 3, 5)),
    daysUntilDeadline: 90,
    claimWindowOpen: true,
  };
}

/**
 * Test user email.
 */
export const TEST_USER_EMAIL = 'john.doe@example.com';

/**
 * Test user ID.
 */
export const TEST_USER_ID = 'user-001';

/**
 * Various passenger name formats for testing.
 */
export const PASSENGER_NAMES = {
  STANDARD: 'John Doe',
  UPPERCASE: 'JOHN DOE',
  LOWERCASE: 'john doe',
  SINGLE_NAME: 'John',
  THREE_PARTS: 'John Michael Doe',
  WITH_HYPHEN: 'Mary-Jane Watson',
  EMPTY: '',
  WHITESPACE: '  John   Doe  ',
};

/**
 * Expected parsed names for each format.
 */
export const EXPECTED_PARSED_NAMES = {
  STANDARD: { firstName: 'John', lastName: 'Doe' },
  UPPERCASE: { firstName: 'John', lastName: 'Doe' },
  LOWERCASE: { firstName: 'John', lastName: 'Doe' },
  SINGLE_NAME: { firstName: 'John', lastName: '' },
  THREE_PARTS: { firstName: 'John', lastName: 'Michael Doe' },
  WITH_HYPHEN: { firstName: 'Mary-jane', lastName: 'Watson' },
  EMPTY: { firstName: '', lastName: '' },
  WHITESPACE: { firstName: 'John', lastName: 'Doe' },
};

/**
 * Station codes and expected display names.
 */
export const STATION_TEST_DATA = {
  GBSPX: 'London St Pancras',
  FRPLY: 'Paris Gare du Nord',
  UNKNOWN: 'UNKNOWN', // Should return the code itself
};

/**
 * Journey dates for testing.
 */
export const JOURNEY_DATES = {
  JAN_5_2026: new Date(Date.UTC(2026, 0, 5)),
  DEC_31_2025: new Date(Date.UTC(2025, 11, 31)),
  FEB_29_2024: new Date(Date.UTC(2024, 1, 29)), // Leap year
};

/**
 * Expected formatted dates.
 */
export const EXPECTED_FORMATTED_DATES = {
  JAN_5_2026: '05/01/2026',
  DEC_31_2025: '31/12/2025',
  FEB_29_2024: '29/02/2024',
};
