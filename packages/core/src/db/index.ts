import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDb>;

/**
 * Create a database connection with Drizzle ORM.
 *
 * @param connectionString - PostgreSQL connection URL
 * @param options - Optional postgres.js connection options
 * @returns Drizzle database instance with schema
 */
export function createDb(
  connectionString: string,
  options?: postgres.Options<Record<string, postgres.PostgresType>>
) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ...options,
  });

  return drizzle(client, { schema });
}

/**
 * Create a database connection from DATABASE_URL environment variable.
 *
 * @throws Error if DATABASE_URL is not set
 * @returns Drizzle database instance with schema
 */
export function createDbFromEnv() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return createDb(connectionString);
}

// Re-export schema
export * from './schema.js';

// Re-export connection management
export * from './connection.js';

// Re-export migration utilities
export { runMigrations, type MigrateOptions } from './migrate.js';
export { seedDatabase, type SeedOptions } from './seed.js';
