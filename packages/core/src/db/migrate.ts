import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MigrateOptions {
  /** PostgreSQL connection URL */
  connectionString?: string;
  /** Path to migrations folder (defaults to drizzle folder) */
  migrationsFolder?: string;
  /** Log migration progress */
  verbose?: boolean;
}

/**
 * Runs database migrations programmatically.
 * Suitable for production deployments and CI/CD pipelines.
 *
 * @param options - Migration configuration options
 * @throws Error if DATABASE_URL is not set and no connectionString provided
 */
export async function runMigrations(options: MigrateOptions = {}): Promise<void> {
  const connectionString = options.connectionString ?? process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const migrationsFolder =
    options.migrationsFolder ?? path.resolve(__dirname, '../../drizzle');

  if (options.verbose) {
    console.log(`Running migrations from: ${migrationsFolder}`);
  }

  // Use a single connection for migrations (not pooled)
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    if (options.verbose) {
      console.log('Starting database migration...');
    }

    await migrate(db, { migrationsFolder });

    if (options.verbose) {
      console.log('Migrations completed successfully');
    }
  } finally {
    await sql.end();
  }
}

// CLI entry point
async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  try {
    await runMigrations({ verbose });
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  void main();
}
