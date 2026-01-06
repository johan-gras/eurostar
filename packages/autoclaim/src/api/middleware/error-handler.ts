/**
 * Error handling middleware.
 *
 * Provides consistent error responses across all routes.
 */

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { createErrorResponse, ApiErrorCode } from '../types.js';

/**
 * Custom API error class.
 */
export class ApiException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /**
   * Create a 400 Bad Request error.
   */
  static badRequest(
    message: string,
    code: string = ApiErrorCode.INVALID_REQUEST,
    details?: unknown
  ): ApiException {
    return new ApiException(400, code, message, details);
  }

  /**
   * Create a 401 Unauthorized error.
   */
  static unauthorized(
    message = 'Unauthorized',
    code = ApiErrorCode.UNAUTHORIZED
  ): ApiException {
    return new ApiException(401, code, message);
  }

  /**
   * Create a 403 Forbidden error.
   */
  static forbidden(message = 'Forbidden'): ApiException {
    return new ApiException(403, 'FORBIDDEN', message);
  }

  /**
   * Create a 404 Not Found error.
   */
  static notFound(
    message: string,
    code: string = ApiErrorCode.NOT_FOUND
  ): ApiException {
    return new ApiException(404, code, message);
  }

  /**
   * Create a 409 Conflict error.
   */
  static conflict(
    message: string,
    code = ApiErrorCode.ALREADY_EXISTS,
    details?: unknown
  ): ApiException {
    return new ApiException(409, code, message, details);
  }

  /**
   * Create a 422 Unprocessable Entity error.
   */
  static unprocessable(
    message: string,
    code: string,
    details?: unknown
  ): ApiException {
    return new ApiException(422, code, message, details);
  }

  /**
   * Create a 500 Internal Server Error.
   */
  static internal(
    message = 'Internal server error',
    details?: unknown
  ): ApiException {
    return new ApiException(500, ApiErrorCode.INTERNAL_ERROR, message, details);
  }

  /**
   * Create a 503 Service Unavailable error.
   */
  static serviceUnavailable(
    message = 'Service unavailable'
  ): ApiException {
    return new ApiException(503, ApiErrorCode.SERVICE_UNAVAILABLE, message);
  }
}

/**
 * Register error handler on Fastify instance.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: FastifyError | ApiException | Error, request: FastifyRequest, reply: FastifyReply) => {
      // Log error for debugging
      request.log.error(error);

      // Handle ApiException
      if (error instanceof ApiException) {
        return reply.status(error.statusCode).send(
          createErrorResponse(error.code, error.message, error.details)
        );
      }

      // Handle Fastify validation errors
      if ('validation' in error && error.validation) {
        return reply.status(400).send(
          createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            'Validation error',
            error.validation
          )
        );
      }

      // Handle Fastify errors with statusCode
      if ('statusCode' in error && typeof error.statusCode === 'number') {
        const statusCode = error.statusCode;
        let code: string = ApiErrorCode.INTERNAL_ERROR;

        switch (statusCode) {
          case 400:
            code = ApiErrorCode.INVALID_REQUEST;
            break;
          case 401:
            code = ApiErrorCode.UNAUTHORIZED;
            break;
          case 404:
            code = ApiErrorCode.NOT_FOUND;
            break;
          case 409:
            code = ApiErrorCode.ALREADY_EXISTS;
            break;
        }

        return reply.status(statusCode).send(
          createErrorResponse(code, error.message)
        );
      }

      // Handle unknown errors
      const isDev = process.env['NODE_ENV'] !== 'production';
      return reply.status(500).send(
        createErrorResponse(
          ApiErrorCode.INTERNAL_ERROR,
          isDev ? error.message : 'Internal server error',
          isDev ? { stack: error.stack } : undefined
        )
      );
    }
  );
}

/**
 * Register 404 handler for undefined routes.
 */
export function registerNotFoundHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        `Route ${request.method} ${request.url} not found`
      )
    );
  });
}
