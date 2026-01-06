/**
 * Fastify handler for Prometheus metrics endpoint.
 *
 * Provides:
 * - /metrics endpoint for Prometheus scraping
 * - Request metrics middleware (optional)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  metrics,
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
} from './metrics.js';

/**
 * Options for metrics routes.
 */
export interface MetricsRoutesOptions {
  /** Path for the metrics endpoint (default: /metrics) */
  path?: string;
  /** Enable request timing middleware (default: true) */
  enableRequestMetrics?: boolean;
  /** Paths to exclude from request metrics (default: ['/metrics', '/health']) */
  excludePaths?: string[];
}

/**
 * Register metrics endpoint and optional request metrics middleware.
 *
 * @example
 * ```ts
 * import { registerMetricsRoutes } from '@eurostar/core/monitoring';
 *
 * await registerMetricsRoutes(app);
 * // Now GET /metrics returns Prometheus format metrics
 * ```
 */
export function registerMetricsRoutes(
  app: FastifyInstance,
  options: MetricsRoutesOptions = {}
): void {
  const {
    path = '/metrics',
    enableRequestMetrics = true,
    excludePaths = ['/metrics', '/health', '/health/ready', '/health/live'],
  } = options;

  // Register request metrics middleware if enabled
  if (enableRequestMetrics) {
    app.addHook('onRequest', (request: FastifyRequest) => {
      // Skip excluded paths
      if (excludePaths.some((p) => request.url.startsWith(p))) {
        return;
      }

      // Track in-flight requests
      httpRequestsInFlight.inc({ method: request.method });

      // Start timer
      (request as FastifyRequest & { metricsTimer?: () => number }).metricsTimer =
        httpRequestDuration.startTimer({
          method: request.method,
          route: request.routeOptions?.url ?? request.url,
        });
    });

    app.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply) => {
      // Skip excluded paths
      if (excludePaths.some((p) => request.url.startsWith(p))) {
        return;
      }

      // Decrement in-flight counter
      httpRequestsInFlight.dec({ method: request.method });

      // Record duration
      const timer = (request as FastifyRequest & { metricsTimer?: () => number }).metricsTimer;
      if (timer) {
        timer();
      }

      // Increment request counter
      const labels = {
        method: request.method,
        route: request.routeOptions?.url ?? request.url,
        status_code: String(reply.statusCode),
      };
      httpRequestsTotal.inc(labels);
    });
  }

  // Register metrics endpoint
  app.get(
    path,
    {
      schema: {
        hide: true, // Hide from OpenAPI docs
        response: {
          200: {
            type: 'string',
            description: 'Prometheus metrics in text format',
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const output = metrics.serialize();
      return reply
        .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(output);
    }
  );
}
