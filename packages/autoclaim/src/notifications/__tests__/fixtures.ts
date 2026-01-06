/**
 * Test fixtures for the notification module.
 */

import {
  NotificationType,
  type ClaimEligiblePayload,
  type DeadlineWarningPayload,
  type ClaimReminderPayload,
  type ClaimEligibleEmailProps,
  type DeadlineWarningEmailProps,
} from '../types.js';
import type { ClaimNotificationData } from '../service.js';

/**
 * Fixed test dates for consistent testing.
 */
export const FIXED_JOURNEY_DATE = new Date(Date.UTC(2026, 0, 5, 8, 0, 0)); // Jan 5, 2026
export const FIXED_DEADLINE_DATE = new Date(Date.UTC(2026, 3, 5)); // Apr 5, 2026 (3 months later)

/**
 * Sample user data for testing.
 */
export const TEST_USER = {
  id: 'user-123',
  email: 'john.doe@example.com',
  firstName: 'John',
};

/**
 * Sample claim data for testing.
 */
export const TEST_CLAIM = {
  id: 'claim-456',
  userId: 'user-123',
  bookingId: 'booking-789',
  delayMinutes: 90,
  cashAmount: 45.0,
  voucherAmount: 67.5,
  currency: 'EUR',
  status: 'eligible' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Sample booking data for testing.
 */
export const TEST_BOOKING = {
  trainNumber: '9007',
  origin: 'GBSPX',
  destination: 'FRPLY',
  journeyDate: FIXED_JOURNEY_DATE,
  pnr: 'ABC123',
  tcn: 'IV123456789',
};

/**
 * Complete notification data for testing.
 */
export const TEST_NOTIFICATION_DATA: ClaimNotificationData = {
  claim: TEST_CLAIM as any,
  user: TEST_USER,
  booking: TEST_BOOKING,
};

/**
 * Sample claim eligible payload.
 */
export const CLAIM_ELIGIBLE_PAYLOAD: ClaimEligiblePayload = {
  type: NotificationType.CLAIM_ELIGIBLE,
  userId: TEST_USER.id,
  email: TEST_USER.email,
  firstName: TEST_USER.firstName,
  claimId: TEST_CLAIM.id,
  trainNumber: '9007',
  origin: 'London St Pancras',
  destination: 'Paris Gare du Nord',
  journeyDate: 'Monday, 5 January 2026',
  delayMinutes: 90,
  cashAmount: 45.0,
  voucherAmount: 67.5,
  currency: 'EUR',
  claimUrl: 'https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation',
  deadline: 'Sunday, 5 April 2026',
};

/**
 * Sample deadline warning payload.
 */
export const DEADLINE_WARNING_PAYLOAD: DeadlineWarningPayload = {
  type: NotificationType.DEADLINE_WARNING,
  userId: TEST_USER.id,
  email: TEST_USER.email,
  firstName: TEST_USER.firstName,
  claimId: TEST_CLAIM.id,
  trainNumber: '9007',
  origin: 'London St Pancras',
  destination: 'Paris Gare du Nord',
  journeyDate: 'Monday, 5 January 2026',
  cashAmount: 45.0,
  currency: 'EUR',
  claimUrl: 'https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation',
  deadline: 'Sunday, 5 April 2026',
  daysRemaining: 7,
};

/**
 * Sample claim reminder payload.
 */
export const CLAIM_REMINDER_PAYLOAD: ClaimReminderPayload = {
  type: NotificationType.CLAIM_REMINDER,
  userId: TEST_USER.id,
  email: TEST_USER.email,
  firstName: TEST_USER.firstName,
  claimId: TEST_CLAIM.id,
  trainNumber: '9007',
  origin: 'London St Pancras',
  destination: 'Paris Gare du Nord',
  journeyDate: 'Monday, 5 January 2026',
  cashAmount: 45.0,
  currency: 'EUR',
  claimUrl: 'https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation',
  deadline: 'Sunday, 5 April 2026',
  daysUntilDeadline: 30,
};

/**
 * Email template props for claim eligible.
 */
export const CLAIM_ELIGIBLE_PROPS: ClaimEligibleEmailProps = {
  firstName: 'John',
  trainNumber: '9007',
  origin: 'London St Pancras',
  destination: 'Paris Gare du Nord',
  journeyDate: 'Monday, 5 January 2026',
  delayMinutes: 90,
  cashAmount: 45.0,
  voucherAmount: 67.5,
  currency: 'EUR',
  claimUrl: 'https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation',
  deadline: 'Sunday, 5 April 2026',
};

/**
 * Email template props for deadline warning.
 */
export const DEADLINE_WARNING_PROPS: DeadlineWarningEmailProps = {
  firstName: 'John',
  trainNumber: '9007',
  origin: 'London St Pancras',
  destination: 'Paris Gare du Nord',
  journeyDate: 'Monday, 5 January 2026',
  cashAmount: 45.0,
  currency: 'EUR',
  claimUrl: 'https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation',
  deadline: 'Sunday, 5 April 2026',
  daysRemaining: 7,
};

/**
 * GBP variant of claim eligible payload.
 */
export const CLAIM_ELIGIBLE_PAYLOAD_GBP: ClaimEligiblePayload = {
  ...CLAIM_ELIGIBLE_PAYLOAD,
  cashAmount: 38.25,
  voucherAmount: 57.38,
  currency: 'GBP',
};

/**
 * Create notification data with custom values.
 */
export function createTestNotificationData(
  overrides: Partial<ClaimNotificationData> = {}
): ClaimNotificationData {
  return {
    claim: { ...TEST_CLAIM, ...(overrides.claim ?? {}) } as any,
    user: { ...TEST_USER, ...(overrides.user ?? {}) },
    booking: { ...TEST_BOOKING, ...(overrides.booking ?? {}) },
  };
}

/**
 * Create claim eligible payload with custom values.
 */
export function createClaimEligiblePayload(
  overrides: Partial<ClaimEligiblePayload> = {}
): ClaimEligiblePayload {
  return {
    ...CLAIM_ELIGIBLE_PAYLOAD,
    ...overrides,
  };
}

/**
 * Create deadline warning payload with custom values.
 */
export function createDeadlineWarningPayload(
  overrides: Partial<DeadlineWarningPayload> = {}
): DeadlineWarningPayload {
  return {
    ...DEADLINE_WARNING_PAYLOAD,
    ...overrides,
  };
}
