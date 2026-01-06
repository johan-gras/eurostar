import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  createConnectionPool,
  type ConnectionManager,
} from '../../db/connection.js';
import { users, trains, bookings, claims } from '../../db/schema.js';

/**
 * Integration tests for database connection and queries.
 * These tests require a real PostgreSQL database.
 *
 * Run with: INTEGRATION_TESTS=true pnpm test
 */

const SKIP_INTEGRATION =
  process.env['INTEGRATION_TESTS'] !== 'true' ||
  !process.env['DATABASE_URL'];

describe.skipIf(SKIP_INTEGRATION)('Database Integration', () => {
  let connection: ConnectionManager;

  beforeAll(async () => {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for integration tests');
    }

    connection = createConnectionPool(connectionString, {
      max: 2,
      idleTimeout: 5,
      connectTimeout: 5,
    });
  });

  afterAll(async () => {
    if (connection) {
      await connection.shutdown();
    }
  });

  describe('Connection Health', () => {
    it('should establish a healthy database connection', async () => {
      const isHealthy = await connection.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should execute a simple query', async () => {
      const result = await connection.sql`SELECT 1 as value`;
      expect(result).toHaveLength(1);
      expect(result[0]?.value).toBe(1);
    });

    it('should return current timestamp', async () => {
      const result = await connection.sql`SELECT NOW() as now`;
      expect(result).toHaveLength(1);
      expect(result[0]?.now).toBeInstanceOf(Date);
    });
  });

  describe('Schema Queries', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    let testUserId: string;

    beforeEach(async () => {
      // Clean up any existing test data
      await connection.db
        .delete(users)
        .where(eq(users.email, testEmail));
    });

    afterAll(async () => {
      // Clean up test user
      if (testUserId) {
        await connection.db
          .delete(users)
          .where(eq(users.id, testUserId));
      }
    });

    it('should insert and retrieve a user', async () => {
      const [insertedUser] = await connection.db
        .insert(users)
        .values({
          email: testEmail,
          passwordHash: '$2b$12$test-hash',
          emailVerified: false,
        })
        .returning();

      expect(insertedUser).toBeDefined();
      expect(insertedUser?.email).toBe(testEmail);
      expect(insertedUser?.id).toBeDefined();

      testUserId = insertedUser!.id;

      // Retrieve the user
      const [foundUser] = await connection.db
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(testEmail);
      expect(foundUser?.emailVerified).toBe(false);
    });

    it('should update a user', async () => {
      // Insert a user
      const [insertedUser] = await connection.db
        .insert(users)
        .values({
          email: testEmail,
          passwordHash: '$2b$12$test-hash',
          emailVerified: false,
        })
        .returning();

      testUserId = insertedUser!.id;

      // Update the user
      const [updatedUser] = await connection.db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, testUserId))
        .returning();

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.emailVerified).toBe(true);
    });

    it('should delete a user', async () => {
      // Insert a user
      const [insertedUser] = await connection.db
        .insert(users)
        .values({
          email: testEmail,
          passwordHash: '$2b$12$test-hash',
          emailVerified: false,
        })
        .returning();

      const userId = insertedUser!.id;

      // Delete the user
      await connection.db.delete(users).where(eq(users.id, userId));

      // Verify deletion
      const [deletedUser] = await connection.db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      expect(deletedUser).toBeUndefined();

      // Clear testUserId since we already deleted it
      testUserId = '';
    });

    it('should enforce unique email constraint', async () => {
      // Insert first user
      await connection.db.insert(users).values({
        email: testEmail,
        passwordHash: '$2b$12$test-hash',
        emailVerified: false,
      });

      // Attempt to insert duplicate
      await expect(
        connection.db.insert(users).values({
          email: testEmail,
          passwordHash: '$2b$12$another-hash',
          emailVerified: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('Trains Table', () => {
    const testTripId = `test-${Date.now()}-0105`;
    let testTrainId: string;

    afterAll(async () => {
      if (testTrainId) {
        await connection.db
          .delete(trains)
          .where(eq(trains.id, testTrainId));
      }
    });

    it('should insert and query a train', async () => {
      const journeyDate = new Date('2024-06-15');
      const scheduledDeparture = new Date('2024-06-15T08:30:00Z');
      const scheduledArrival = new Date('2024-06-15T11:30:00Z');

      const [insertedTrain] = await connection.db
        .insert(trains)
        .values({
          tripId: testTripId,
          trainNumber: '9007',
          date: journeyDate,
          scheduledDeparture,
          scheduledArrival,
          trainType: 'e320',
        })
        .returning();

      expect(insertedTrain).toBeDefined();
      expect(insertedTrain?.tripId).toBe(testTripId);
      expect(insertedTrain?.trainNumber).toBe('9007');
      expect(insertedTrain?.trainType).toBe('e320');

      testTrainId = insertedTrain!.id;
    });

    it('should update train delay information', async () => {
      if (!testTrainId) {
        // Insert a train first
        const [insertedTrain] = await connection.db
          .insert(trains)
          .values({
            tripId: testTripId,
            trainNumber: '9007',
            date: new Date('2024-06-15'),
            scheduledDeparture: new Date('2024-06-15T08:30:00Z'),
            scheduledArrival: new Date('2024-06-15T11:30:00Z'),
            trainType: 'e320',
          })
          .returning();
        testTrainId = insertedTrain!.id;
      }

      const actualArrival = new Date('2024-06-15T12:15:00Z');

      const [updatedTrain] = await connection.db
        .update(trains)
        .set({
          actualArrival,
          delayMinutes: 45,
        })
        .where(eq(trains.id, testTrainId))
        .returning();

      expect(updatedTrain).toBeDefined();
      expect(updatedTrain?.delayMinutes).toBe(45);
      expect(updatedTrain?.actualArrival).toEqual(actualArrival);
    });
  });

  describe('Transaction Support', () => {
    it('should rollback transaction on error', async () => {
      const email1 = `tx-test-1-${Date.now()}@example.com`;
      const email2 = `tx-test-2-${Date.now()}@example.com`;

      // Clean up before test
      await connection.db.delete(users).where(eq(users.email, email1));
      await connection.db.delete(users).where(eq(users.email, email2));

      try {
        await connection.db.transaction(async (tx) => {
          // Insert first user - should succeed
          await tx.insert(users).values({
            email: email1,
            passwordHash: '$2b$12$hash1',
            emailVerified: false,
          });

          // Insert second user with same email - should fail
          await tx.insert(users).values({
            email: email1, // Duplicate!
            passwordHash: '$2b$12$hash2',
            emailVerified: false,
          });
        });

        // Should not reach here
        expect.fail('Transaction should have thrown');
      } catch {
        // Expected - transaction rolled back
      }

      // Verify first user was NOT inserted (rollback worked)
      const [user] = await connection.db
        .select()
        .from(users)
        .where(eq(users.email, email1));

      expect(user).toBeUndefined();
    });

    it('should commit transaction on success', async () => {
      const email = `tx-success-${Date.now()}@example.com`;

      // Clean up before test
      await connection.db.delete(users).where(eq(users.email, email));

      await connection.db.transaction(async (tx) => {
        await tx.insert(users).values({
          email,
          passwordHash: '$2b$12$hash',
          emailVerified: false,
        });

        // Update in same transaction
        await tx
          .update(users)
          .set({ emailVerified: true })
          .where(eq(users.email, email));
      });

      // Verify user was inserted and updated
      const [user] = await connection.db
        .select()
        .from(users)
        .where(eq(users.email, email));

      expect(user).toBeDefined();
      expect(user?.emailVerified).toBe(true);

      // Clean up
      await connection.db.delete(users).where(eq(users.email, email));
    });
  });
});
