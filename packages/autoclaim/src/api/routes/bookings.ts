/**
 * Booking routes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, isNotNull, isNull, gt, count } from 'drizzle-orm';
import type { Database } from '@eurostar/core/db';
import { bookings, claims } from '@eurostar/core/db';
import { parseBookingEmail, type ParsedBooking } from '../../email-parser/index.js';
import { EligibilityService } from '../../eligibility/index.js';
import type { EligibilityStatus } from '../../eligibility/types.js';
import {
  BookingParamsSchema,
  type BookingParams,
  CreateBookingSchema,
  type CreateBooking,
  ListBookingsQuerySchema,
  type ListBookingsQuery,
  isEmailRequest,
  BookingResponseSchema,
  SuccessResponseSchema,
  SuccessListResponseSchema,
  ErrorResponseSchema,
} from '../schemas.js';
import {
  createSuccessResponse,
  toBookingResponse,
  toClaimResponse,
  ApiErrorCode,
  type BookingResponse,
  type BookingDetailResponse,
  type SuccessResponse,
  type PaginationMeta,
} from '../types.js';
import { ApiException } from '../middleware/error-handler.js';

/**
 * Booking routes options.
 */
export interface BookingRoutesOptions {
  db: Database;
  eligibilityService?: EligibilityService;
}

/**
 * Register booking routes.
 */
export async function registerBookingRoutes(
  app: FastifyInstance,
  options: BookingRoutesOptions
): Promise<void> {
  const {
    db,
    eligibilityService = new EligibilityService(),
  } = options;

  /**
   * POST /api/v1/bookings - Create booking from email or manual entry
   */
  app.post<{
    Body: CreateBooking;
    Reply: SuccessResponse<BookingResponse>;
  }>(
    '/api/v1/bookings',
    {
      preHandler: [app.authenticate],
      schema: {
        body: CreateBookingSchema,
        response: {
          201: SuccessResponseSchema(BookingResponseSchema),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateBooking }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      let parsed: ParsedBooking;

      // Parse booking data
      if (isEmailRequest(request.body)) {
        const result = parseBookingEmail(request.body.emailBody);
        if (result.isErr()) {
          throw ApiException.badRequest(
            result.error.message,
            'PARSE_ERROR',
            { field: result.error.field, rawValue: result.error.rawValue }
          );
        }
        parsed = result.value;
      } else {
        // Manual entry - construct parsed booking
        parsed = {
          pnr: request.body.pnr.toUpperCase(),
          tcn: request.body.tcn,
          trainNumber: request.body.trainNumber,
          journeyDate: new Date(request.body.journeyDate),
          passengerName: request.body.passengerName,
          origin: request.body.origin.toUpperCase(),
          destination: request.body.destination.toUpperCase(),
          coach: request.body.coach,
          seat: request.body.seat,
        };
      }

      // Check for duplicate booking
      const existing = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.userId, userId),
            eq(bookings.pnr, parsed.pnr),
            eq(bookings.tcn, parsed.tcn)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw ApiException.conflict(
          'A booking with this PNR and TCN already exists',
          ApiErrorCode.ALREADY_EXISTS,
          { existingId: existing[0]!.id }
        );
      }

      // Create booking
      const [newBooking] = await db
        .insert(bookings)
        .values({
          userId,
          pnr: parsed.pnr,
          tcn: parsed.tcn,
          trainNumber: parsed.trainNumber,
          journeyDate: parsed.journeyDate,
          passengerName: parsed.passengerName,
          origin: parsed.origin,
          destination: parsed.destination,
          coach: parsed.coach,
          seat: parsed.seat,
        })
        .returning();

      if (!newBooking) {
        throw ApiException.internal('Failed to create booking');
      }

      return reply.status(201).send(
        createSuccessResponse(toBookingResponse(newBooking))
      );
    }
  );

  /**
   * GET /api/v1/bookings - List user's bookings
   */
  app.get<{
    Querystring: ListBookingsQuery;
    Reply: SuccessResponse<BookingResponse[]>;
  }>(
    '/api/v1/bookings',
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: ListBookingsQuerySchema,
        response: {
          200: SuccessListResponseSchema(BookingResponseSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ListBookingsQuery }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      const page = request.query.page ?? 1;
      const limit = request.query.limit ?? 20;
      const offset = (page - 1) * limit;
      const statusFilter = request.query.status;

      // Build base query
      let whereCondition = eq(bookings.userId, userId);

      // Apply status filter
      if (statusFilter === 'completed') {
        whereCondition = and(
          whereCondition,
          isNotNull(bookings.finalDelayMinutes)
        )!;
      } else if (statusFilter === 'pending') {
        whereCondition = and(
          whereCondition,
          isNull(bookings.finalDelayMinutes)
        )!;
      } else if (statusFilter === 'with_delay') {
        whereCondition = and(
          whereCondition,
          isNotNull(bookings.finalDelayMinutes),
          gt(bookings.finalDelayMinutes, 0)
        )!;
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(bookings)
        .where(whereCondition);

      const total = countResult?.count ?? 0;

      // Get bookings
      const results = await db
        .select()
        .from(bookings)
        .where(whereCondition)
        .orderBy(desc(bookings.createdAt))
        .limit(limit)
        .offset(offset);

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };

      return reply.send(
        createSuccessResponse(results.map(toBookingResponse), meta)
      );
    }
  );

  /**
   * GET /api/v1/bookings/:id - Get booking details with delay status
   */
  app.get<{
    Params: BookingParams;
    Reply: SuccessResponse<BookingDetailResponse>;
  }>(
    '/api/v1/bookings/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        params: BookingParamsSchema,
        response: {
          200: SuccessResponseSchema(BookingResponseSchema),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: BookingParams }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      const bookingId = request.params.id;

      // Get booking
      const [booking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.userId, userId)
          )
        )
        .limit(1);

      if (!booking) {
        throw ApiException.notFound(
          'Booking not found',
          'BOOKING_NOT_FOUND'
        );
      }

      // Get claim if exists
      const [claim] = await db
        .select()
        .from(claims)
        .where(eq(claims.bookingId, bookingId))
        .limit(1);

      // Calculate eligibility if journey is complete
      let eligibility: EligibilityStatus | null = null;
      if (booking.finalDelayMinutes !== null) {
        eligibility = eligibilityService.checkEligibility(
          booking,
          booking.finalDelayMinutes,
          100 // Placeholder ticket price - would come from booking data
        );
      }

      const response: BookingDetailResponse = {
        ...toBookingResponse(booking),
        eligibility,
        claim: claim ? toClaimResponse(claim) : null,
      };

      return reply.send(createSuccessResponse(response));
    }
  );
}
