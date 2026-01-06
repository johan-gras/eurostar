/**
 * Queue routes for the EuroQueue API.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  type Terminal,
  terminalConfig,
  predictQueueTime,
  predictQueueTimeline,
  getBestArrivalTime,
  waitTimeToCrowdLevel,
  crowdLevelToDescription,
} from '@eurostar/euroqueue';
import {
  TerminalParamsSchema,
  type TerminalParams,
  TimelineQuerySchema,
  type TimelineQuery,
  BestArrivalBodySchema,
  type BestArrivalBody,
  TerminalsListResponseSchema,
  CurrentQueueResponseSchema,
  TimelineResponseSchema,
  BestArrivalApiResponseSchema,
  type TerminalInfoResponse,
  type QueuePredictionResponse,
  type TimelinePredictionResponse,
  type BestArrivalResponse,
} from '../schemas/queue.schema.js';
import { ErrorResponseSchema } from '../schemas.js';
import { ApiException } from '../middleware/error-handler.js';

/**
 * Register queue routes.
 */
export async function registerQueueRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/queue/terminals
   * Returns list of all terminals with metadata
   */
  app.get<{
    Reply: { data: TerminalInfoResponse[] };
  }>(
    '/api/v1/queue/terminals',
    {
      schema: {
        response: {
          200: TerminalsListResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const terminals: TerminalInfoResponse[] = Object.values(terminalConfig);
      return reply.send({ data: terminals });
    }
  );

  /**
   * GET /api/v1/queue/:terminal/current
   * Returns current queue prediction for a terminal
   */
  app.get<{
    Params: TerminalParams;
    Reply: { data: QueuePredictionResponse };
  }>(
    '/api/v1/queue/:terminal/current',
    {
      schema: {
        params: TerminalParamsSchema,
        response: {
          200: CurrentQueueResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: TerminalParams }>, reply: FastifyReply) => {
      const { terminal } = request.params;

      if (!terminalConfig[terminal as Terminal]) {
        throw ApiException.notFound(
          `Terminal '${terminal}' not found`,
          'TERMINAL_NOT_FOUND'
        );
      }

      const prediction = predictQueueTime({
        terminal: terminal as Terminal,
        dateTime: new Date(),
      });

      const crowdLevel = waitTimeToCrowdLevel(prediction.estimatedMinutes);
      const crowdDescription = crowdLevelToDescription(crowdLevel);

      const response: QueuePredictionResponse = {
        terminal: prediction.terminal,
        estimatedMinutes: prediction.estimatedMinutes,
        confidence: prediction.confidence,
        crowdLevel,
        crowdDescription,
        updatedAt: prediction.updatedAt.toISOString(),
      };

      return reply.send({ data: response });
    }
  );

  /**
   * GET /api/v1/queue/:terminal/timeline
   * Returns hourly predictions for the next N hours
   */
  app.get<{
    Params: TerminalParams;
    Querystring: TimelineQuery;
    Reply: { data: TimelinePredictionResponse[] };
  }>(
    '/api/v1/queue/:terminal/timeline',
    {
      schema: {
        params: TerminalParamsSchema,
        querystring: TimelineQuerySchema,
        response: {
          200: TimelineResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: TerminalParams; Querystring: TimelineQuery }>,
      reply: FastifyReply
    ) => {
      const { terminal } = request.params;
      const hours = request.query.hours ?? 12;

      if (!terminalConfig[terminal as Terminal]) {
        throw ApiException.notFound(
          `Terminal '${terminal}' not found`,
          'TERMINAL_NOT_FOUND'
        );
      }

      const startTime = new Date();
      const predictions = predictQueueTimeline(terminal as Terminal, startTime, hours);

      const response: TimelinePredictionResponse[] = predictions.map((prediction, index) => {
        const crowdLevel = waitTimeToCrowdLevel(prediction.estimatedMinutes);
        const crowdDescription = crowdLevelToDescription(crowdLevel);
        const dateTime = new Date(startTime.getTime() + index * 60 * 60 * 1000);

        return {
          hour: dateTime.getUTCHours(),
          dateTime: dateTime.toISOString(),
          terminal: prediction.terminal,
          estimatedMinutes: prediction.estimatedMinutes,
          confidence: prediction.confidence,
          crowdLevel,
          crowdDescription,
        };
      });

      return reply.send({ data: response });
    }
  );

  /**
   * POST /api/v1/queue/:terminal/best-arrival
   * Returns the best arrival time to minimize wait while catching your train
   */
  app.post<{
    Params: TerminalParams;
    Body: BestArrivalBody;
    Reply: { data: BestArrivalResponse };
  }>(
    '/api/v1/queue/:terminal/best-arrival',
    {
      schema: {
        params: TerminalParamsSchema,
        body: BestArrivalBodySchema,
        response: {
          200: BestArrivalApiResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: TerminalParams; Body: BestArrivalBody }>,
      reply: FastifyReply
    ) => {
      const { terminal } = request.params;
      const { departureTime, maxWaitMinutes } = request.body;

      if (!terminalConfig[terminal as Terminal]) {
        throw ApiException.notFound(
          `Terminal '${terminal}' not found`,
          'TERMINAL_NOT_FOUND'
        );
      }

      const departure = new Date(departureTime);

      if (isNaN(departure.getTime())) {
        throw ApiException.badRequest(
          'Invalid departure time format',
          'INVALID_DEPARTURE_TIME'
        );
      }

      if (departure <= new Date()) {
        throw ApiException.badRequest(
          'Departure time must be in the future',
          'DEPARTURE_IN_PAST'
        );
      }

      const bestArrival = getBestArrivalTime(
        terminal as Terminal,
        departure,
        maxWaitMinutes
      );

      let response: BestArrivalResponse;

      if (bestArrival) {
        const prediction = predictQueueTime({
          terminal: terminal as Terminal,
          dateTime: bestArrival,
        });

        response = {
          suggestedArrival: bestArrival.toISOString(),
          estimatedWait: prediction.estimatedMinutes,
          departureTime: departure.toISOString(),
          message: `Arrive at ${bestArrival.toISOString()} for an estimated ${prediction.estimatedMinutes} minute wait`,
        };
      } else {
        response = {
          suggestedArrival: null,
          estimatedWait: null,
          departureTime: departure.toISOString(),
          message: `No suitable arrival time found within ${maxWaitMinutes} minute wait constraint`,
        };
      }

      return reply.send({ data: response });
    }
  );
}
