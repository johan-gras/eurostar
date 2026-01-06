import { createConnectionPool } from './connection.js';
import { users, trains, bookings, claims, userPreferences } from './schema.js';
import bcrypt from 'bcrypt';

export interface SeedOptions {
  /** PostgreSQL connection URL */
  connectionString?: string;
  /** Clear existing data before seeding */
  clean?: boolean;
  /** Log seed progress */
  verbose?: boolean;
}

/**
 * Seeds the database with development data.
 * Creates test users, trains, bookings, and claims.
 *
 * @param options - Seed configuration options
 * @throws Error if DATABASE_URL is not set and no connectionString provided
 */
export async function seedDatabase(options: SeedOptions = {}): Promise<void> {
  const connectionString = options.connectionString ?? process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const { db, shutdown } = createConnectionPool(connectionString);

  try {
    if (options.clean) {
      if (options.verbose) {
        console.log('Cleaning existing data...');
      }
      // Delete in reverse order of dependencies
      await db.delete(claims);
      await db.delete(bookings);
      await db.delete(userPreferences);
      await db.delete(trains);
      await db.delete(users);
    }

    if (options.verbose) {
      console.log('Seeding users...');
    }

    // Create test users
    const passwordHash = await bcrypt.hash('password123', 10);

    const [testUser] = await db
      .insert(users)
      .values([
        {
          email: 'test@example.com',
          passwordHash,
          emailVerified: true,
        },
        {
          email: 'unverified@example.com',
          passwordHash,
          emailVerified: false,
          verificationToken: 'test-verification-token',
        },
      ])
      .returning();

    if (options.verbose) {
      console.log('Seeding trains...');
    }

    // Create sample trains (past, present, future)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [delayedTrain, onTimeTrain] = await db
      .insert(trains)
      .values([
        {
          tripId: `9007-${formatDate(yesterday)}`,
          trainNumber: '9007',
          date: yesterday,
          scheduledDeparture: new Date(`${formatDate(yesterday)}T07:01:00Z`),
          scheduledArrival: new Date(`${formatDate(yesterday)}T10:17:00Z`),
          actualArrival: new Date(`${formatDate(yesterday)}T11:32:00Z`), // 75 min delay
          delayMinutes: 75,
          trainType: 'e320',
        },
        {
          tripId: `9015-${formatDate(yesterday)}`,
          trainNumber: '9015',
          date: yesterday,
          scheduledDeparture: new Date(`${formatDate(yesterday)}T09:31:00Z`),
          scheduledArrival: new Date(`${formatDate(yesterday)}T12:47:00Z`),
          actualArrival: new Date(`${formatDate(yesterday)}T12:52:00Z`), // 5 min delay
          delayMinutes: 5,
          trainType: 'e320',
        },
        {
          tripId: `9023-${formatDate(today)}`,
          trainNumber: '9023',
          date: today,
          scheduledDeparture: new Date(`${formatDate(today)}T11:31:00Z`),
          scheduledArrival: new Date(`${formatDate(today)}T14:47:00Z`),
          trainType: 'e320',
        },
        {
          tripId: `9039-${formatDate(tomorrow)}`,
          trainNumber: '9039',
          date: tomorrow,
          scheduledDeparture: new Date(`${formatDate(tomorrow)}T17:31:00Z`),
          scheduledArrival: new Date(`${formatDate(tomorrow)}T20:47:00Z`),
          trainType: 'e300',
        },
      ])
      .returning();

    if (options.verbose) {
      console.log('Seeding bookings...');
    }

    // Create bookings for test user
    const [delayedBooking] = await db
      .insert(bookings)
      .values([
        {
          userId: testUser!.id,
          pnr: 'ABC123',
          tcn: 'IV123456789',
          trainId: delayedTrain!.id,
          trainNumber: '9007',
          journeyDate: yesterday,
          origin: 'FRPLY', // Paris Nord
          destination: 'GBSPX', // St Pancras
          passengerName: 'Test User',
          coach: '5',
          seat: '42',
          finalDelayMinutes: 75,
        },
        {
          userId: testUser!.id,
          pnr: 'DEF456',
          tcn: 'IV987654321',
          trainId: onTimeTrain!.id,
          trainNumber: '9015',
          journeyDate: yesterday,
          origin: 'GBSPX',
          destination: 'FRPLY',
          passengerName: 'Test User',
          coach: '8',
          seat: '15',
          finalDelayMinutes: 5,
        },
      ])
      .returning();

    if (options.verbose) {
      console.log('Seeding claims...');
    }

    // Create claim for delayed booking
    await db.insert(claims).values({
      bookingId: delayedBooking!.id,
      delayMinutes: 75,
      eligibleCashAmount: '25.00',
      eligibleVoucherAmount: '37.50',
      status: 'eligible',
    });

    if (options.verbose) {
      console.log('Seeding user preferences...');
    }

    // Create preferences for test user
    await db.insert(userPreferences).values({
      userId: testUser!.id,
      seatPreferences: {
        position: 'window',
        direction: 'forward',
        coach: 'quiet',
        table: true,
        powerSocket: true,
      },
      queueNotifications: true,
      defaultTerminal: 'st_pancras',
      preferredCompensationType: 'cash',
    });

    if (options.verbose) {
      console.log('Seed completed successfully');
      console.log('  Test user: test@example.com / password123');
    }
  } finally {
    await shutdown();
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// CLI entry point
async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const clean = process.argv.includes('--clean') || process.argv.includes('-c');

  try {
    await seedDatabase({ verbose, clean });
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  void main();
}
