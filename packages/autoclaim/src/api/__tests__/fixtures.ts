/**
 * Test fixtures for API tests.
 */

import type { Booking, Claim, User, ClaimStatus } from '@eurostar/core/db';

/**
 * Create a mock user.
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: null,
    emailVerified: false,
    verificationToken: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock booking.
 */
export function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-123',
    userId: 'user-123',
    pnr: 'ABC123',
    tcn: 'IV123456789',
    trainNumber: '9007',
    trainId: null,
    journeyDate: new Date('2024-06-15'),
    passengerName: 'John Doe',
    origin: 'GBSPX',
    destination: 'FRPLY',
    coach: '7',
    seat: '42',
    finalDelayMinutes: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock claim.
 */
export function createMockClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'claim-123',
    bookingId: 'booking-123',
    delayMinutes: 75,
    eligibleCashAmount: '25.00',
    eligibleVoucherAmount: '60.00',
    status: 'eligible' as ClaimStatus,
    submittedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Valid email body for parsing.
 */
export const validEmailBody = `
Dear Customer,

Thank you for booking with Eurostar.

Booking Reference: ABC123
Ticket Control Number: IV123456789

Journey Details:
Train: 9007
Date: 15 June 2024
From: London St Pancras
To: Paris Gare du Nord

Passenger: John Doe
Coach: 7
Seat: 42

Thank you for traveling with us.
`;

/**
 * Invalid email body (missing PNR).
 */
export const invalidEmailBody = `
Dear Customer,

Thank you for booking with Eurostar.

Journey Details:
Train: 9007
Date: 15 June 2024
`;

/**
 * Manual booking request.
 */
export const validManualBooking = {
  pnr: 'XYZ789',
  tcn: 'IV987654321',
  trainNumber: '9014',
  journeyDate: '2024-07-20',
  passengerName: 'Jane Smith',
  origin: 'FRPLY',
  destination: 'GBSPX',
  coach: '5',
  seat: '18',
};

/**
 * Test JWT payload.
 */
export const testJwtPayload = {
  userId: 'user-123',
  email: 'test@example.com',
};
