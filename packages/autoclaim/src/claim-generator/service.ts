/**
 * Claim generator service.
 *
 * Creates claim records and prepares pre-filled form data.
 * IMPORTANT: We do NOT submit claims automatically. We prepare
 * everything and the user clicks through to Eurostar portal.
 */

import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@eurostar/core/db';
import { claims, bookings, users, type Claim, type Booking } from '@eurostar/core/db';
import { Result, ok, err } from '@eurostar/core/result';
import type { EligibilityStatus } from '../eligibility/types.js';
import { getClaimDeadline } from '../eligibility/deadline.js';
import {
  type ClaimGenerationResult,
  type ClaimWithFormData,
  type ClaimGeneratorError,
  type ListClaimsOptions,
  ClaimGeneratorErrorCode,
  createClaimGeneratorError,
} from './types.js';
import {
  buildClaimFormData,
  generateClaimPortalUrl,
} from './form-data.js';
import { ClaimEventEmitter, createClaimEventEmitter } from './events.js';

/**
 * Service for generating and managing compensation claims.
 */
export class ClaimGeneratorService {
  private readonly events: ClaimEventEmitter;

  constructor(options: { events?: ClaimEventEmitter } = {}) {
    this.events = options.events ?? createClaimEventEmitter();
  }

  /**
   * Gets the event emitter for claim lifecycle events.
   */
  getEventEmitter(): ClaimEventEmitter {
    return this.events;
  }

  /**
   * Creates a new claim for a booking.
   *
   * @param booking - The booking to create a claim for
   * @param eligibility - The eligibility status with compensation amounts
   * @param userEmail - The user's email address
   * @param db - Database connection
   * @returns Result with claim ID and form data, or error
   */
  async createClaim(
    booking: Booking,
    eligibility: EligibilityStatus,
    userEmail: string,
    db: Database
  ): Promise<Result<ClaimGenerationResult, ClaimGeneratorError>> {
    // Verify eligibility
    if (!eligibility.eligible || !eligibility.compensation) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.NOT_ELIGIBLE,
          'Booking is not eligible for compensation',
          { reason: eligibility.reason }
        )
      );
    }

    // Check for existing claim
    const existingClaim = await db
      .select()
      .from(claims)
      .where(eq(claims.bookingId, booking.id))
      .limit(1);

    if (existingClaim.length > 0) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.CLAIM_ALREADY_EXISTS,
          'A claim already exists for this booking',
          { claimId: existingClaim[0]!.id }
        )
      );
    }

    // Create the claim record
    const [newClaim] = await db
      .insert(claims)
      .values({
        bookingId: booking.id,
        delayMinutes: eligibility.compensation.delayMinutes,
        eligibleCashAmount: String(eligibility.compensation.cashAmount),
        eligibleVoucherAmount: String(eligibility.compensation.voucherAmount),
        status: 'eligible',
      })
      .returning();

    if (!newClaim) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.DATABASE_ERROR,
          'Failed to create claim record'
        )
      );
    }

    // Build form data
    const formData = buildClaimFormData(booking, newClaim, userEmail);
    const claimPortalUrl = generateClaimPortalUrl();
    const deadline = getClaimDeadline(booking.journeyDate);

    // Emit claim created event
    this.events.emitClaimCreated({
      claim: newClaim,
      userId: booking.userId,
      bookingId: booking.id,
      formData,
    });

    const result: ClaimGenerationResult = {
      claimId: newClaim.id,
      formData,
      claimPortalUrl,
      status: newClaim.status,
      deadline,
    };

    return ok(result);
  }

  /**
   * Retrieves a claim with its form data.
   *
   * @param claimId - The claim ID
   * @param db - Database connection
   * @returns Result with claim and form data, or error
   */
  async getClaim(
    claimId: string,
    db: Database
  ): Promise<Result<ClaimWithFormData, ClaimGeneratorError>> {
    // Get claim with booking
    const result = await db
      .select({
        claim: claims,
        booking: bookings,
        userEmail: users.email,
      })
      .from(claims)
      .innerJoin(bookings, eq(claims.bookingId, bookings.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(claims.id, claimId))
      .limit(1);

    if (result.length === 0) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.CLAIM_NOT_FOUND,
          'Claim not found',
          { claimId }
        )
      );
    }

    const { claim, booking, userEmail } = result[0]!;
    const formData = buildClaimFormData(booking, claim, userEmail);
    const claimPortalUrl = generateClaimPortalUrl();

    return ok({
      claim,
      formData,
      claimPortalUrl,
    });
  }

  /**
   * Marks a claim as submitted.
   *
   * Call this when the user confirms they have submitted the claim
   * on the Eurostar portal.
   *
   * @param claimId - The claim ID
   * @param db - Database connection
   * @returns Result with updated claim, or error
   */
  async markAsSubmitted(
    claimId: string,
    db: Database
  ): Promise<Result<Claim, ClaimGeneratorError>> {
    // Get current claim
    const existingResult = await db
      .select({
        claim: claims,
        booking: bookings,
      })
      .from(claims)
      .innerJoin(bookings, eq(claims.bookingId, bookings.id))
      .where(eq(claims.id, claimId))
      .limit(1);

    if (existingResult.length === 0) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.CLAIM_NOT_FOUND,
          'Claim not found',
          { claimId }
        )
      );
    }

    const { claim: existingClaim, booking } = existingResult[0]!;

    // Validate status transition
    if (existingClaim.status !== 'eligible' && existingClaim.status !== 'pending') {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.INVALID_STATUS_TRANSITION,
          `Cannot mark claim as submitted from status: ${existingClaim.status}`,
          { currentStatus: existingClaim.status }
        )
      );
    }

    const submittedAt = new Date();

    // Update claim status
    const [updatedClaim] = await db
      .update(claims)
      .set({
        status: 'submitted',
        submittedAt,
      })
      .where(eq(claims.id, claimId))
      .returning();

    if (!updatedClaim) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.DATABASE_ERROR,
          'Failed to update claim status'
        )
      );
    }

    // Emit status changed event
    this.events.emitStatusChanged({
      claimId,
      previousStatus: existingClaim.status,
      newStatus: 'submitted',
      userId: booking.userId,
    });

    // Emit submitted event
    this.events.emitClaimSubmitted({
      claimId,
      userId: booking.userId,
      bookingId: booking.id,
      submittedAt,
    });

    return ok(updatedClaim);
  }

  /**
   * Lists all claims for a user.
   *
   * @param userId - The user ID
   * @param db - Database connection
   * @param options - Optional filters
   * @returns Array of claims with form data
   */
  async listUserClaims(
    userId: string,
    db: Database,
    options: ListClaimsOptions = {}
  ): Promise<ClaimWithFormData[]> {
    // Get user email first
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return [];
    }

    // Build query
    let query = db
      .select({
        claim: claims,
        booking: bookings,
      })
      .from(claims)
      .innerJoin(bookings, eq(claims.bookingId, bookings.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(claims.createdAt))
      .$dynamic();

    // Apply status filter
    if (options.status) {
      query = query.where(
        and(eq(bookings.userId, userId), eq(claims.status, options.status))
      );
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query;

    // Build form data for each claim
    return results.map(({ claim, booking }) => ({
      claim,
      formData: buildClaimFormData(booking, claim, user.email),
      claimPortalUrl: generateClaimPortalUrl(),
    }));
  }

  /**
   * Gets a claim by booking ID.
   *
   * @param bookingId - The booking ID
   * @param db - Database connection
   * @returns Result with claim and form data, or error if not found
   */
  async getClaimByBookingId(
    bookingId: string,
    db: Database
  ): Promise<Result<ClaimWithFormData, ClaimGeneratorError>> {
    const result = await db
      .select({
        claim: claims,
        booking: bookings,
        userEmail: users.email,
      })
      .from(claims)
      .innerJoin(bookings, eq(claims.bookingId, bookings.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(claims.bookingId, bookingId))
      .limit(1);

    if (result.length === 0) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.CLAIM_NOT_FOUND,
          'No claim found for this booking',
          { bookingId }
        )
      );
    }

    const { claim, booking, userEmail } = result[0]!;
    const formData = buildClaimFormData(booking, claim, userEmail);
    const claimPortalUrl = generateClaimPortalUrl();

    return ok({
      claim,
      formData,
      claimPortalUrl,
    });
  }

  /**
   * Updates claim status (for admin/webhook use).
   *
   * @param claimId - The claim ID
   * @param newStatus - The new status
   * @param db - Database connection
   * @returns Result with updated claim, or error
   */
  async updateStatus(
    claimId: string,
    newStatus: 'approved' | 'rejected' | 'expired',
    db: Database
  ): Promise<Result<Claim, ClaimGeneratorError>> {
    // Get current claim
    const existingResult = await db
      .select({
        claim: claims,
        booking: bookings,
      })
      .from(claims)
      .innerJoin(bookings, eq(claims.bookingId, bookings.id))
      .where(eq(claims.id, claimId))
      .limit(1);

    if (existingResult.length === 0) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.CLAIM_NOT_FOUND,
          'Claim not found',
          { claimId }
        )
      );
    }

    const { claim: existingClaim, booking } = existingResult[0]!;

    // Update claim status
    const [updatedClaim] = await db
      .update(claims)
      .set({ status: newStatus })
      .where(eq(claims.id, claimId))
      .returning();

    if (!updatedClaim) {
      return err(
        createClaimGeneratorError(
          ClaimGeneratorErrorCode.DATABASE_ERROR,
          'Failed to update claim status'
        )
      );
    }

    // Emit status changed event
    this.events.emitStatusChanged({
      claimId,
      previousStatus: existingClaim.status,
      newStatus,
      userId: booking.userId,
    });

    return ok(updatedClaim);
  }
}

/**
 * Creates a new ClaimGeneratorService instance.
 */
export function createClaimGeneratorService(
  options: { events?: ClaimEventEmitter } = {}
): ClaimGeneratorService {
  return new ClaimGeneratorService(options);
}
