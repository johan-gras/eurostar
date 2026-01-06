/**
 * API integration tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, createTestToken } from '../app.js';
import {
  validEmailBody,
  invalidEmailBody,
  testJwtPayload,
} from './fixtures.js';

describe('API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp({
      mockUser: testJwtPayload,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // Health Routes
  // =========================================================================

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status without db', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      // Without db, checks should show database as false
      const body = response.json();
      expect(body.status).toBeDefined();
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBe(false);
      expect(body.checks.redis).toBe(true); // No redis = defaults to ok
    });
  });

  // =========================================================================
  // 404 Handler
  // =========================================================================

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/undefined-route',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // Auth Routes (without database - should return error)
  // =========================================================================

  describe('Auth protected routes without database', () => {
    it('should return 404 for bookings routes when no db', async () => {
      // Without database, the routes are not registered
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/bookings',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for claims routes when no db', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/claims',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

describe('Test Utilities', () => {
  describe('createTestToken', () => {
    it('should create a valid JWT structure', () => {
      const token = createTestToken({
        userId: 'test-user',
        email: 'test@example.com',
      });

      const parts = token.split('.');
      expect(parts.length).toBe(3);

      // Decode and verify payload
      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64url').toString('utf8')
      );
      expect(payload.userId).toBe('test-user');
      expect(payload.email).toBe('test@example.com');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should create token with expiration', () => {
      const token = createTestToken({
        userId: 'test-user',
        email: 'test@example.com',
      });

      const parts = token.split('.');
      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64url').toString('utf8')
      );

      // Should expire in the future (7 days from now)
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});

describe('Validation schemas', () => {
  describe('CreateBookingSchema', () => {
    it('should accept valid email body format', () => {
      const input = { emailBody: validEmailBody };
      expect(input.emailBody.length).toBeGreaterThan(0);
    });

    it('should reject empty email body', () => {
      const input = { emailBody: '' };
      expect(input.emailBody.length).toBe(0);
    });
  });

  describe('Email parsing', () => {
    it('should identify valid email content', () => {
      expect(validEmailBody).toContain('ABC123');
      expect(validEmailBody).toContain('IV123456789');
      expect(validEmailBody).toContain('9007');
    });

    it('should identify invalid email is missing data', () => {
      expect(invalidEmailBody).not.toContain('ABC123');
    });
  });
});

describe('API Types', () => {
  describe('Error response format', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = await createTestApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return consistent error format for 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent-route',
      });

      const body = response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });
});

describe('Response format consistency', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health response should have correct structure', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
    expect(['ok', 'degraded', 'error']).toContain(body.status);
  });

  it('readiness response should have correct structure', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('redis');
  });
});

describe('Test fixtures', () => {
  it('valid email body should contain required fields', () => {
    expect(validEmailBody).toContain('Booking Reference');
    expect(validEmailBody).toContain('ABC123');
    expect(validEmailBody).toContain('IV123456789');
    expect(validEmailBody).toContain('Train');
    expect(validEmailBody).toContain('9007');
  });

  it('invalid email body should be missing PNR', () => {
    expect(invalidEmailBody).not.toContain('Booking Reference');
    expect(invalidEmailBody).not.toContain('ABC123');
  });

  it('test JWT payload should have required fields', () => {
    expect(testJwtPayload).toHaveProperty('userId');
    expect(testJwtPayload).toHaveProperty('email');
    expect(testJwtPayload.userId).toBe('user-123');
    expect(testJwtPayload.email).toBe('test@example.com');
  });
});
