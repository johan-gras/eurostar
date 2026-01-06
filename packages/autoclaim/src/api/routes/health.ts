/**
 * Health check routes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '@eurostar/core/db';
import type { Redis } from 'ioredis';
import { sql } from 'drizzle-orm';
import { VERSION } from '../../index.js';
import { HealthResponseSchema, ReadinessResponseSchema, LivenessResponseSchema } from '../schemas.js';
import type { HealthResponse, ReadinessResponse, LivenessResponse } from '../types.js';

// Track server start time for uptime calculation
const startTime = Date.now();

/**
 * Health routes options.
 */
export interface HealthRoutesOptions {
  db?: Database | undefined;
  redis?: Redis | undefined;
}

/**
 * Register health check routes.
 */
export function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRoutesOptions = {}
): void {
  const { db, redis } = options;

  /**
   * GET /health - Basic health check
   */
  app.get<{
    Reply: HealthResponse;
  }>(
    '/health',
    {
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const response: HealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };
      return reply.send(response);
    }
  );

  /**
   * GET /health/live - Simple liveness check
   */
  app.get<{
    Reply: LivenessResponse;
  }>(
    '/health/live',
    {
      schema: {
        response: {
          200: LivenessResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ status: 'ok' });
    }
  );

  /**
   * GET /health/ready - Readiness check (db + redis connected)
   */
  app.get<{
    Reply: ReadinessResponse;
  }>(
    '/health/ready',
    {
      schema: {
        response: {
          200: ReadinessResponseSchema,
          503: ReadinessResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const checks = {
        database: false,
        redis: false,
      };

      // Check database connection
      if (db) {
        try {
          await db.execute(sql`SELECT 1`);
          checks.database = true;
        } catch {
          checks.database = false;
        }
      }

      // Check Redis connection
      if (redis) {
        try {
          await redis.ping();
          checks.redis = true;
        } catch {
          checks.redis = false;
        }
      } else {
        // No redis configured - mark as ok
        checks.redis = true;
      }

      const allHealthy = checks.database && checks.redis;
      const anyHealthy = checks.database || checks.redis;

      let status: 'ok' | 'degraded' | 'error';
      if (allHealthy) {
        status = 'ok';
      } else if (anyHealthy) {
        status = 'degraded';
      } else {
        status = 'error';
      }

      const response: ReadinessResponse = {
        status,
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        checks,
      };

      const statusCode = status === 'error' ? 503 : 200;
      return reply.status(statusCode).send(response);
    }
  );
}
