/**
 * Types for the claim generator service.
 */

import type { Claim, ClaimStatus } from '@eurostar/core/db';

/**
 * All fields needed to populate Eurostar's claim form.
 */
export interface ClaimFormData {
  /** Booking Reference (PNR) - 6 alphanumeric characters */
  pnr: string;
  /** Ticket Control Number - IV + 9 digits OR 15 + 9 digits */
  tcn: string;
  /** Passenger first name */
  firstName: string;
  /** Passenger last name */
  lastName: string;
  /** Passenger email address */
  email: string;
  /** 4-digit train number */
  trainNumber: string;
  /** Journey date (formatted for display) */
  journeyDate: string;
  /** Origin station name */
  origin: string;
  /** Destination station name */
  destination: string;
  /** Actual delay in minutes */
  delayMinutes: number;
  /** Cash compensation amount eligible */
  eligibleCashAmount: number;
  /** Voucher compensation amount eligible */
  eligibleVoucherAmount: number;
}

/**
 * Result of claim generation.
 */
export interface ClaimGenerationResult {
  /** Generated claim ID */
  claimId: string;
  /** Pre-filled form data */
  formData: ClaimFormData;
  /** URL to Eurostar claim portal */
  claimPortalUrl: string;
  /** Status of the claim */
  status: ClaimStatus;
  /** Claim deadline */
  deadline: Date;
}

/**
 * Error codes for claim generation failures.
 */
export const ClaimGeneratorErrorCode = {
  /** Booking not found */
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  /** Claim already exists for booking */
  CLAIM_ALREADY_EXISTS: 'CLAIM_ALREADY_EXISTS',
  /** Booking is not eligible for compensation */
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  /** Claim not found */
  CLAIM_NOT_FOUND: 'CLAIM_NOT_FOUND',
  /** Invalid status transition */
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  /** Missing required data */
  MISSING_DATA: 'MISSING_DATA',
  /** Database operation failed */
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ClaimGeneratorErrorCode =
  (typeof ClaimGeneratorErrorCode)[keyof typeof ClaimGeneratorErrorCode];

/**
 * Claim generator error with code and message.
 */
export interface ClaimGeneratorError {
  code: ClaimGeneratorErrorCode;
  message: string;
  /** Additional context */
  details?: unknown;
}

/**
 * Creates a ClaimGeneratorError with the given code and message.
 */
export function createClaimGeneratorError(
  code: ClaimGeneratorErrorCode,
  message: string,
  details?: unknown
): ClaimGeneratorError {
  const error: ClaimGeneratorError = { code, message };
  if (details !== undefined) error.details = details;
  return error;
}

/**
 * Claim with associated form data.
 */
export interface ClaimWithFormData {
  /** The claim record */
  claim: Claim;
  /** Pre-filled form data */
  formData: ClaimFormData;
  /** URL to Eurostar claim portal */
  claimPortalUrl: string;
}

/**
 * Summary of a user's claims.
 */
export interface UserClaimsSummary {
  /** Total number of claims */
  total: number;
  /** Claims by status */
  byStatus: Record<ClaimStatus, number>;
  /** Total potential cash compensation */
  totalCashAmount: number;
  /** Total potential voucher compensation */
  totalVoucherAmount: number;
}

/**
 * Options for listing claims.
 */
export interface ListClaimsOptions {
  /** Filter by status */
  status?: ClaimStatus;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Station codes to display names.
 */
export const STATION_NAMES: Record<string, string> = {
  // UK stations
  GBSPX: 'London St Pancras',
  GBEBS: 'Ebbsfleet International',
  GBASH: 'Ashford International',
  // French stations
  FRPLY: 'Paris Gare du Nord',
  FRLIL: 'Lille Europe',
  FRCFK: 'Calais Fréthun',
  // Belgian stations
  BEBMI: 'Brussels Midi',
  // Dutch stations
  NLAMA: 'Amsterdam Centraal',
  NLRTD: 'Rotterdam Centraal',
  // German stations
  DECGN: 'Cologne Hbf',
};

/**
 * Eurostar claim portal base URL.
 */
export const EUROSTAR_CLAIM_PORTAL_URL = 'https://www.eurostar.com/uk-en/travel-info/service-information/delay-compensation';
