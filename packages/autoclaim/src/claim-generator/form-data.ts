/**
 * Form data utilities for claim generation.
 */

import type { Booking, Claim } from '@eurostar/core/db';
import type { ClaimFormData } from './types.js';
import { STATION_NAMES, EUROSTAR_CLAIM_PORTAL_URL } from './types.js';

/**
 * Parses a full passenger name into first and last name.
 * Handles common name formats:
 * - "John Doe" → { firstName: "John", lastName: "Doe" }
 * - "JOHN DOE" → { firstName: "John", lastName: "Doe" }
 * - "John" → { firstName: "John", lastName: "" }
 * - "John Michael Doe" → { firstName: "John", lastName: "Michael Doe" }
 */
export function parsePassengerName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return {
      firstName: capitalizeWord(parts[0]!),
      lastName: '',
    };
  }

  const firstName = capitalizeWord(parts[0]!);
  const lastName = parts
    .slice(1)
    .map(capitalizeWord)
    .join(' ');

  return { firstName, lastName };
}

/**
 * Capitalizes a word (first letter uppercase, rest lowercase).
 */
function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Formats a date for display in the claim form.
 * Uses DD/MM/YYYY format (European standard).
 */
export function formatJourneyDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converts a station code to its display name.
 * Returns the code if no name mapping exists.
 */
export function getStationDisplayName(stationCode: string): string {
  return STATION_NAMES[stationCode] ?? stationCode;
}

/**
 * Builds claim form data from a booking and claim record.
 *
 * @param booking - The booking associated with the claim
 * @param claim - The claim record
 * @param email - The passenger email address
 * @returns Complete form data for the Eurostar claim portal
 */
export function buildClaimFormData(
  booking: Booking,
  claim: Claim,
  email: string
): ClaimFormData {
  const { firstName, lastName } = parsePassengerName(booking.passengerName);

  return {
    pnr: booking.pnr,
    tcn: booking.tcn,
    firstName,
    lastName,
    email,
    trainNumber: booking.trainNumber,
    journeyDate: formatJourneyDate(booking.journeyDate),
    origin: getStationDisplayName(booking.origin),
    destination: getStationDisplayName(booking.destination),
    delayMinutes: claim.delayMinutes,
    eligibleCashAmount: Number(claim.eligibleCashAmount ?? 0),
    eligibleVoucherAmount: Number(claim.eligibleVoucherAmount ?? 0),
  };
}

/**
 * Generates the Eurostar claim portal URL.
 * Note: Eurostar's form doesn't support URL parameters for pre-filling,
 * so we return the base URL.
 */
export function generateClaimPortalUrl(): string {
  return EUROSTAR_CLAIM_PORTAL_URL;
}

/**
 * Formats claim form data as text for easy copy-paste.
 * Useful for users who want to manually fill the form.
 */
export function formatForClipboard(formData: ClaimFormData): string {
  const lines = [
    '=== Eurostar Delay Compensation Claim ===',
    '',
    'Booking Reference (PNR): ' + formData.pnr,
    'Ticket Control Number: ' + formData.tcn,
    '',
    '--- Passenger Details ---',
    'First Name: ' + formData.firstName,
    'Last Name: ' + formData.lastName,
    'Email: ' + formData.email,
    '',
    '--- Journey Details ---',
    'Train Number: ' + formData.trainNumber,
    'Journey Date: ' + formData.journeyDate,
    'From: ' + formData.origin,
    'To: ' + formData.destination,
    '',
    '--- Delay Information ---',
    'Delay: ' + formData.delayMinutes + ' minutes',
    '',
    '--- Compensation Eligible ---',
    `Cash: €${formData.eligibleCashAmount.toFixed(2)}`,
    `Voucher: €${formData.eligibleVoucherAmount.toFixed(2)}`,
    '',
    'Submit your claim at:',
    EUROSTAR_CLAIM_PORTAL_URL,
  ];

  return lines.join('\n');
}

/**
 * Formats claim form data as JSON for API responses.
 */
export function formatAsJson(formData: ClaimFormData): string {
  return JSON.stringify(formData, null, 2);
}

/**
 * Validates that all required fields are present in form data.
 */
export function validateFormData(formData: ClaimFormData): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!formData.pnr) missingFields.push('pnr');
  if (!formData.tcn) missingFields.push('tcn');
  if (!formData.firstName) missingFields.push('firstName');
  if (!formData.email) missingFields.push('email');
  if (!formData.trainNumber) missingFields.push('trainNumber');
  if (!formData.journeyDate) missingFields.push('journeyDate');
  if (!formData.origin) missingFields.push('origin');
  if (!formData.destination) missingFields.push('destination');
  if (formData.delayMinutes <= 0) missingFields.push('delayMinutes');

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
