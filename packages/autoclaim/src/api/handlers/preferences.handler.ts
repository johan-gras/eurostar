/**
 * User preferences routes handler.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '@eurostar/core/db';
import { PreferencesRepository, PreferencesService } from '@eurostar/core/preferences';
import {
  UpdatePreferencesBodySchema,
  type UpdatePreferencesBody,
  GetPreferencesResponseSchema,
  UpdatePreferencesResponseSchema,
  type PreferencesResponse,
} from '../schemas/preferences.schema.js';
import { ErrorResponseSchema } from '../schemas.js';
import { ApiException } from '../middleware/error-handler.js';
import { ApiErrorCode } from '../types.js';

/**
 * Preferences routes options.
 */
export interface PreferencesRoutesOptions {
  db: Database;
}

/**
 * Transform user preferences to API response format.
 */
function toPreferencesResponse(prefs: {
  id: string;
  userId: string;
  seatPreferences: unknown;
  queueNotifications: boolean;
  defaultTerminal: string | null;
  preferredCompensationType: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PreferencesResponse {
  return {
    id: prefs.id || null,
    userId: prefs.userId,
    seatPreferences: prefs.seatPreferences as PreferencesResponse['seatPreferences'],
    queueNotifications: prefs.queueNotifications,
    defaultTerminal: prefs.defaultTerminal as PreferencesResponse['defaultTerminal'],
    preferredCompensationType: prefs.preferredCompensationType as PreferencesResponse['preferredCompensationType'],
    createdAt: prefs.createdAt.toISOString(),
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

/**
 * Register user preferences routes.
 */
export async function registerPreferencesRoutes(
  app: FastifyInstance,
  options: PreferencesRoutesOptions
): Promise<void> {
  const { db } = options;

  // Create repository and service
  const preferencesRepository = new PreferencesRepository(db);
  const preferencesService = new PreferencesService(preferencesRepository);

  /**
   * GET /api/v1/user/preferences - Get current user's preferences
   */
  app.get(
    '/api/v1/user/preferences',
    {
      preHandler: [app.authenticate],
      schema: {
        response: {
          200: GetPreferencesResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;

      const result = await preferencesService.getPreferences(userId);

      // Result is always Ok for getPreferences
      const prefs = result.unwrap();

      return reply.send({
        data: toPreferencesResponse(prefs),
      });
    }
  );

  /**
   * PATCH /api/v1/user/preferences - Update current user's preferences
   */
  app.patch<{
    Body: UpdatePreferencesBody;
  }>(
    '/api/v1/user/preferences',
    {
      preHandler: [app.authenticate],
      schema: {
        body: UpdatePreferencesBodySchema,
        response: {
          200: UpdatePreferencesResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: UpdatePreferencesBody }>, reply: FastifyReply) => {
      const userId = request.jwtUser!.userId;
      const body = request.body;

      const result = await preferencesService.updatePreferences(userId, {
        seatPreferences: body.seatPreferences,
        queueNotifications: body.queueNotifications,
        defaultTerminal: body.defaultTerminal,
        preferredCompensationType: body.preferredCompensationType,
      });

      if (result.isErr()) {
        const error = result.error;
        if (error === 'invalid_seat_preferences') {
          throw ApiException.badRequest(
            'Invalid seat preferences',
            ApiErrorCode.VALIDATION_ERROR
          );
        }
        throw ApiException.internal('Failed to update preferences');
      }

      const prefs = result.unwrap();

      return reply.send({
        data: toPreferencesResponse(prefs),
      });
    }
  );
}
