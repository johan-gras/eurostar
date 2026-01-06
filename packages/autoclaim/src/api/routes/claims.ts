/**
 * Claims routes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import type { Database } from '@eurostar/core/db';
import { claims, bookings, users } from '@eurostar/core/db';
import { ClaimGeneratorService, buildClaimFormData, generateClaimPortalUrl } from '../../claim-generator/index.js';
import {
  ClaimParamsSchema,
  type ClaimParams,
  ListClaimsQuerySchema,
  type ListClaimsQuery,
  ClaimResponseSchema,
  SuccessResponseSchema,
  SuccessListResponseSchema,
  ErrorResponseSchema,
} from '../schemas.js';
import {
  createSuccessResponse,
  toClaimResponse,
  toBookingResponse,
  ApiErrorCode,
  type ClaimResponse,
  type ClaimDetailResponse,
  type SuccessResponse,
  type PaginationMeta,
} from '../types.js';
import { ApiException } from '../middleware/error-handler.js';

/**
 * Claims routes options.
 */
export interface ClaimsRoutesOptions {
  db: Database;
  claimService?: ClaimGeneratorService;
}

/**
 * Register claims routes.
 */
export function registerClaimsRoutes(
  app: FastifyInstance,
  options: ClaimsRoutesOptions
): void {
  const { db, claimService = new ClaimGeneratorService() } = options;

  /**
   * GET /api/v1/claims - List user's claims
   */
  app.get<{
    Querystring: ListClaimsQuery;
    Reply: SuccessResponse<ClaimResponse[]>;
  }>(
    '/api/v1/claims',
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: ListClaimsQuerySchema,
        response: {
          200: SuccessListResponseSchema(ClaimResponseSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ListClaimsQuery }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      const page = request.query.page ?? 1;
      const limit = request.query.limit ?? 20;
      const offset = (page - 1) * limit;
      const statusFilter = request.query.status;

      // Build where condition
      let whereCondition = eq(bookings.userId, userId);
      if (statusFilter) {
        whereCondition = and(
          whereCondition,
          eq(claims.status, statusFilter)
        )!;
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(claims)
        .innerJoin(bookings, eq(claims.bookingId, bookings.id))
        .where(whereCondition);

      const total = countResult?.count ?? 0;

      // Get claims
      const results = await db
        .select({ claim: claims })
        .from(claims)
        .innerJoin(bookings, eq(claims.bookingId, bookings.id))
        .where(whereCondition)
        .orderBy(desc(claims.createdAt))
        .limit(limit)
        .offset(offset);

      const meta: PaginationMeta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };

      return reply.send(
        createSuccessResponse(
          results.map(({ claim }) => toClaimResponse(claim)),
          meta
        )
      );
    }
  );

  /**
   * GET /api/v1/claims/:id - Get claim with pre-filled form data
   */
  app.get<{
    Params: ClaimParams;
    Reply: SuccessResponse<ClaimDetailResponse>;
  }>(
    '/api/v1/claims/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        params: ClaimParamsSchema,
        response: {
          200: SuccessResponseSchema(ClaimResponseSchema),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: ClaimParams }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      const claimId = request.params.id;

      // Get claim with booking and user
      const result = await db
        .select({
          claim: claims,
          booking: bookings,
          userEmail: users.email,
        })
        .from(claims)
        .innerJoin(bookings, eq(claims.bookingId, bookings.id))
        .innerJoin(users, eq(bookings.userId, users.id))
        .where(
          and(
            eq(claims.id, claimId),
            eq(bookings.userId, userId)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw ApiException.notFound(
          'Claim not found',
          'CLAIM_NOT_FOUND'
        );
      }

      const { claim, booking, userEmail } = result[0]!;

      // Build form data
      const formData = buildClaimFormData(booking, claim, userEmail);
      const claimPortalUrl = generateClaimPortalUrl();

      const response: ClaimDetailResponse = {
        ...toClaimResponse(claim),
        formData,
        claimPortalUrl,
        booking: toBookingResponse(booking),
      };

      return reply.send(createSuccessResponse(response));
    }
  );

  /**
   * POST /api/v1/claims/:id/submitted - Mark claim as submitted by user
   */
  app.post<{
    Params: ClaimParams;
    Reply: SuccessResponse<ClaimResponse>;
  }>(
    '/api/v1/claims/:id/submitted',
    {
      preHandler: [app.authenticate],
      schema: {
        params: ClaimParamsSchema,
        response: {
          200: SuccessResponseSchema(ClaimResponseSchema),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          422: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: ClaimParams }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      const claimId = request.params.id;

      // Verify claim belongs to user
      const [verification] = await db
        .select({ claimId: claims.id })
        .from(claims)
        .innerJoin(bookings, eq(claims.bookingId, bookings.id))
        .where(
          and(
            eq(claims.id, claimId),
            eq(bookings.userId, userId)
          )
        )
        .limit(1);

      if (!verification) {
        throw ApiException.notFound(
          'Claim not found',
          'CLAIM_NOT_FOUND'
        );
      }

      // Mark as submitted
      const result = await claimService.markAsSubmitted(claimId, db);

      if (result.isErr()) {
        const error = result.error;
        if (error.code === 'INVALID_STATUS_TRANSITION') {
          throw ApiException.unprocessable(
            error.message,
            ApiErrorCode.INVALID_STATUS_TRANSITION,
            error.details
          );
        }
        throw ApiException.internal(error.message);
      }

      return reply.send(createSuccessResponse(toClaimResponse(result.value)));
    }
  );
}
