import { createTestToken, TEST_USER } from '../setup/test-fixtures';
import * as fs from 'node:fs';
import * as path from 'node:path';

const API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Helper to make authenticated API requests.
 */
async function apiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const token = createTestToken(TEST_USER.id, TEST_USER.email);

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

/**
 * Seed a test user in the database.
 */
export async function seedTestUser(): Promise<void> {
  // The user is created implicitly via JWT auth in development mode
  // For a real seeding scenario, you'd insert directly into the database
  console.log('Test user will be created on first authenticated request');
}

/**
 * Create a test booking via API.
 */
export async function createTestBooking(data: {
  pnr: string;
  tcn: string;
  trainNumber: string;
  journeyDate: string;
  passengerName: string;
  origin: string;
  destination: string;
  coach?: string;
  seat?: string;
}): Promise<{ id: string }> {
  const response = await apiRequest('POST', '/api/v1/bookings', data);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create booking: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a test booking from email body.
 */
export async function createTestBookingFromEmail(emailBody: string): Promise<{ id: string }> {
  const response = await apiRequest('POST', '/api/v1/bookings', { emailBody });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create booking from email: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Fetch all bookings for the test user.
 */
export async function fetchTestBookings(): Promise<Array<{ id: string; pnr: string }>> {
  const response = await apiRequest('GET', '/api/v1/bookings');

  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Fetch all claims for the test user.
 */
export async function fetchTestClaims(): Promise<Array<{ id: string; bookingId: string; status: string }>> {
  const response = await apiRequest('GET', '/api/v1/claims');

  if (!response.ok) {
    throw new Error('Failed to fetch claims');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Load the test booking email fixture.
 */
export function loadTestBookingEmail(): string {
  const fixturesDir = path.resolve(__dirname);
  return fs.readFileSync(path.join(fixturesDir, 'test-booking-email.txt'), 'utf-8');
}

/**
 * Seed data for claim flow testing.
 * Creates a booking with a completed journey and delay.
 */
export interface ClaimTestData {
  booking: {
    id: string;
    pnr: string;
    tcn: string;
    trainNumber: string;
    journeyDate: string;
    passengerName: string;
    origin: string;
    destination: string;
    finalDelayMinutes: number;
  };
  claim?: {
    id: string;
    status: string;
    delayMinutes: number;
  };
}

/**
 * Create seed data for claim testing.
 * Note: This requires direct database access to set finalDelayMinutes
 * which triggers claim creation. For E2E tests, we'll use manual booking
 * creation and check if claims are auto-generated.
 */
export async function seedClaimTestData(): Promise<ClaimTestData> {
  // Create a booking with past journey date
  const booking = await createTestBooking({
    pnr: 'CLAIM1',
    tcn: 'IV999888777',
    trainNumber: '9007',
    journeyDate: '2026-01-01', // Past date
    passengerName: 'Mr Claim Test User',
    origin: 'GBSPX',
    destination: 'FRPLY',
    coach: '5',
    seat: '42',
  });

  // In a full integration, the delay monitor would update finalDelayMinutes
  // and create a claim. For E2E testing, we might need to mock this or
  // seed directly to the database.

  return {
    booking: {
      ...booking,
      pnr: 'CLAIM1',
      tcn: 'IV999888777',
      trainNumber: '9007',
      journeyDate: '2026-01-01',
      passengerName: 'Mr Claim Test User',
      origin: 'GBSPX',
      destination: 'FRPLY',
      finalDelayMinutes: 0, // Would be set by delay monitor
    },
  };
}

/**
 * Clean up test data.
 */
export async function cleanupTestData(): Promise<void> {
  // In a real scenario, you'd delete test data from the database
  // For now, test data is ephemeral and gets cleaned on each test run
  console.log('Test data cleanup - skipped (database will be reset on next run)');
}
