/**
 * Seat routes for the seatmap API.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  type TrainType,
  type CoachClass,
  e320Config,
  getSeatInfo,
  getSeatsByCoach,
  recommendSeats,
} from '@eurostar/seatmap';
import {
  TrainTypeParamsSchema,
  type TrainTypeParams,
  CoachParamsSchema,
  type CoachParams,
  SeatParamsSchema,
  type SeatParams,
  RecommendSeatsBodySchema,
  type RecommendSeatsBody,
  CoachesListResponseSchema,
  SeatsListResponseSchema,
  SeatResponseSchema,
  RecommendationsResponseSchema,
  type CoachInfoResponse,
  type SeatInfoResponse,
} from '../schemas/seats.schema.js';
import { ErrorResponseSchema } from '../schemas.js';
import { ApiException } from '../middleware/error-handler.js';

/**
 * Get train configuration by type.
 * Currently only e320 is fully implemented.
 */
function getTrainConfig(trainType: TrainType) {
  if (trainType === 'e320') {
    return e320Config;
  }
  return null;
}

/**
 * Get class for a coach number based on train config.
 */
function getCoachClass(trainType: TrainType, coachNumber: number): CoachClass | null {
  const config = getTrainConfig(trainType);
  if (!config) return null;

  for (const [className, coaches] of Object.entries(config.classLayout) as [CoachClass, number[]][]) {
    if (coaches.includes(coachNumber)) {
      return className;
    }
  }
  return null;
}

/**
 * Register seat routes.
 */
export async function registerSeatRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/seats/:trainType/coaches
   * Returns list of coaches with their class and seat counts
   */
  app.get<{
    Params: TrainTypeParams;
    Reply: { data: CoachInfoResponse[] };
  }>(
    '/api/v1/seats/:trainType/coaches',
    {
      schema: {
        params: TrainTypeParamsSchema,
        response: {
          200: CoachesListResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: TrainTypeParams }>, reply: FastifyReply) => {
      const { trainType } = request.params;
      const config = getTrainConfig(trainType as TrainType);

      if (!config) {
        throw ApiException.notFound(
          `Train type '${trainType}' not found or not yet supported`,
          'TRAIN_TYPE_NOT_FOUND'
        );
      }

      const coaches: CoachInfoResponse[] = [];

      for (let coachNum = 1; coachNum <= config.coachCount; coachNum++) {
        const coachClass = getCoachClass(trainType as TrainType, coachNum);
        if (!coachClass) continue;

        const seats = getSeatsByCoach(coachNum);
        coaches.push({
          coachNumber: coachNum,
          class: coachClass,
          seatCount: seats.length,
        });
      }

      return reply.send({ data: coaches });
    }
  );

  /**
   * GET /api/v1/seats/:trainType/coach/:coachNumber
   * Returns all seats in a specific coach
   */
  app.get<{
    Params: CoachParams;
    Reply: { data: SeatInfoResponse[] };
  }>(
    '/api/v1/seats/:trainType/coach/:coachNumber',
    {
      schema: {
        params: CoachParamsSchema,
        response: {
          200: SeatsListResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: CoachParams }>, reply: FastifyReply) => {
      const { trainType, coachNumber } = request.params;
      const coachNum = parseInt(coachNumber, 10);
      const config = getTrainConfig(trainType as TrainType);

      if (!config) {
        throw ApiException.notFound(
          `Train type '${trainType}' not found or not yet supported`,
          'TRAIN_TYPE_NOT_FOUND'
        );
      }

      if (coachNum < 1 || coachNum > config.coachCount) {
        throw ApiException.notFound(
          `Coach ${coachNum} not found. Valid coaches are 1-${config.coachCount}`,
          'COACH_NOT_FOUND'
        );
      }

      const seats = getSeatsByCoach(coachNum);

      return reply.send({ data: seats });
    }
  );

  /**
   * GET /api/v1/seats/:trainType/:coach/:seatNumber
   * Returns info for a specific seat
   */
  app.get<{
    Params: SeatParams;
    Reply: { data: SeatInfoResponse };
  }>(
    '/api/v1/seats/:trainType/:coach/:seatNumber',
    {
      schema: {
        params: SeatParamsSchema,
        response: {
          200: SeatResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: SeatParams }>, reply: FastifyReply) => {
      const { trainType, coach, seatNumber } = request.params;
      const coachNum = parseInt(coach, 10);
      const config = getTrainConfig(trainType as TrainType);

      if (!config) {
        throw ApiException.notFound(
          `Train type '${trainType}' not found or not yet supported`,
          'TRAIN_TYPE_NOT_FOUND'
        );
      }

      if (coachNum < 1 || coachNum > config.coachCount) {
        throw ApiException.notFound(
          `Coach ${coachNum} not found. Valid coaches are 1-${config.coachCount}`,
          'COACH_NOT_FOUND'
        );
      }

      const seat = getSeatInfo(coachNum, seatNumber);

      if (!seat) {
        throw ApiException.notFound(
          `Seat ${seatNumber} not found in coach ${coachNum}`,
          'SEAT_NOT_FOUND'
        );
      }

      return reply.send({ data: seat });
    }
  );

  /**
   * POST /api/v1/seats/:trainType/recommend
   * Returns recommended seats based on preferences
   */
  app.post<{
    Params: TrainTypeParams;
    Body: RecommendSeatsBody;
    Reply: { data: Array<{ seats: SeatInfoResponse[]; totalScore: number; averageScore: number }> };
  }>(
    '/api/v1/seats/:trainType/recommend',
    {
      schema: {
        params: TrainTypeParamsSchema,
        body: RecommendSeatsBodySchema,
        response: {
          200: RecommendationsResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: TrainTypeParams; Body: RecommendSeatsBody }>, reply: FastifyReply) => {
      const { trainType } = request.params;
      const { preferences = {}, coachClass, count = 5 } = request.body;
      const config = getTrainConfig(trainType as TrainType);

      if (!config) {
        throw ApiException.notFound(
          `Train type '${trainType}' not found or not yet supported`,
          'TRAIN_TYPE_NOT_FOUND'
        );
      }

      // Validate coach class exists for this train
      if (!config.classLayout[coachClass] || config.classLayout[coachClass].length === 0) {
        throw ApiException.badRequest(
          `Coach class '${coachClass}' not available on ${trainType}`,
          'INVALID_COACH_CLASS'
        );
      }

      const recommendations = recommendSeats(coachClass, preferences, count);

      return reply.send({ data: recommendations });
    }
  );
}
