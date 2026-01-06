/**
 * Input sanitization middleware for API requests.
 * Trims strings and removes potentially dangerous characters.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Recursively sanitize all string values in an object.
 * - Trims whitespace
 * - Removes null bytes
 * - Limits string length to prevent DoS
 */
export function sanitizeObject<T>(obj: T, maxStringLength = 100000): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Trim whitespace
    let sanitized = obj.trim();
    // Remove null bytes (can cause issues in databases)
    sanitized = sanitized.replace(/\0/g, '');
    // Truncate extremely long strings
    if (sanitized.length > maxStringLength) {
      sanitized = sanitized.slice(0, maxStringLength);
    }
    return sanitized as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, maxStringLength)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, maxStringLength);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Sanitize email to lowercase and trim.
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Register sanitization hooks on the Fastify instance.
 */
export function registerSanitization(app: FastifyInstance): void {
  // Sanitize request body before validation
  app.addHook('preValidation', async (request: FastifyRequest) => {
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeObject(request.body);
    }
    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeObject(request.query);
    }
    if (request.params && typeof request.params === 'object') {
      request.params = sanitizeObject(request.params);
    }
  });
}
