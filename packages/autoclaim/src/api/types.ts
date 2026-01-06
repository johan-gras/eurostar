/**
 * API types for request/response formatting.
 */

import type { Booking, Claim, ClaimStatus } from '@eurostar/core/db';
import type { ClaimFormData, EligibilityStatus } from '../index.js';

/**
 * Standard error response format.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Error response wrapper.
 */
export interface ErrorResponse {
  error: ApiError;
}

/**
 * Success response wrapper with data.
 */
export interface SuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API error codes.
 */
export const ApiErrorCode = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  CLAIM_NOT_FOUND: 'CLAIM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Business logic errors
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  PARSE_ERROR: 'PARSE_ERROR',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/**
 * Creates an error response object.
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  const error: ApiError = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return { error };
}

/**
 * Creates a success response object.
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: PaginationMeta
): SuccessResponse<T> {
  const response: SuccessResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create booking from email body.
 */
export interface CreateBookingFromEmailRequest {
  emailBody: string;
}

/**
 * Create booking with manual fields.
 */
export interface CreateBookingManualRequest {
  pnr: string;
  tcn: string;
  trainNumber: string;
  journeyDate: string;
  passengerName: string;
  origin: string;
  destination: string;
  coach?: string;
  seat?: string;
}

/**
 * Create booking request (either email or manual).
 */
export type CreateBookingRequest =
  | CreateBookingFromEmailRequest
  | CreateBookingManualRequest;

/**
 * List query params with pagination.
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  status?: ClaimStatus;
}

/**
 * ID param for single resource.
 */
export interface IdParams {
  id: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Booking response with delay status.
 */
export interface BookingResponse {
  id: string;
  pnr: string;
  tcn: string;
  trainNumber: string;
  journeyDate: string;
  passengerName: string;
  origin: string;
  destination: string;
  coach: string | null;
  seat: string | null;
  finalDelayMinutes: number | null;
  trainId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Booking with eligibility info.
 */
export interface BookingDetailResponse extends BookingResponse {
  eligibility: EligibilityStatus | null;
  claim: ClaimResponse | null;
}

/**
 * Claim response.
 */
export interface ClaimResponse {
  id: string;
  bookingId: string;
  delayMinutes: number;
  eligibleCashAmount: number;
  eligibleVoucherAmount: number;
  status: ClaimStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Claim with form data response.
 */
export interface ClaimDetailResponse extends ClaimResponse {
  formData: ClaimFormData;
  claimPortalUrl: string;
  booking: BookingResponse;
}

/**
 * Health check response.
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
}

/**
 * Liveness check response.
 */
export interface LivenessResponse {
  status: 'ok';
}

/**
 * Readiness check response.
 */
export interface ReadinessResponse extends HealthResponse {
  checks: {
    database: boolean;
    redis: boolean;
  };
}

// ============================================================================
// Transformers
// ============================================================================

/**
 * Transform a booking database record to API response format.
 */
export function toBookingResponse(booking: Booking): BookingResponse {
  return {
    id: booking.id,
    pnr: booking.pnr,
    tcn: booking.tcn,
    trainNumber: booking.trainNumber,
    journeyDate: booking.journeyDate.toISOString().split('T')[0]!,
    passengerName: booking.passengerName,
    origin: booking.origin,
    destination: booking.destination,
    coach: booking.coach,
    seat: booking.seat,
    finalDelayMinutes: booking.finalDelayMinutes,
    trainId: booking.trainId,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

/**
 * Transform a claim database record to API response format.
 */
export function toClaimResponse(claim: Claim): ClaimResponse {
  return {
    id: claim.id,
    bookingId: claim.bookingId,
    delayMinutes: claim.delayMinutes,
    eligibleCashAmount: claim.eligibleCashAmount
      ? parseFloat(claim.eligibleCashAmount)
      : 0,
    eligibleVoucherAmount: claim.eligibleVoucherAmount
      ? parseFloat(claim.eligibleVoucherAmount)
      : 0,
    status: claim.status,
    submittedAt: claim.submittedAt?.toISOString() ?? null,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  };
}
