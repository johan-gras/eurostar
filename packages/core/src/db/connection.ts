import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

export interface ConnectionPoolConfig {
  /** Maximum number of connections in the pool (default: 10) */
  max?: number;
  /** Idle connection timeout in seconds (default: 20) */
  idleTimeout?: number;
  /** Connection timeout in seconds (default: 10) */
  connectTimeout?: number;
  /** Max lifetime of a connection in seconds (default: 3600) */
  maxLifetime?: number;
}

export interface ConnectionManager {
  db: Database;
  sql: Sql;
  healthCheck: () => Promise<boolean>;
  shutdown: () => Promise<void>;
}

const DEFAULT_CONFIG: Required<ConnectionPoolConfig> = {
  max: 10,
  idleTimeout: 20,
  connectTimeout: 10,
  maxLifetime: 3600,
};

/**
 * Creates a managed database connection pool with health check and graceful shutdown.
 *
 * @param connectionString - PostgreSQL connection URL
 * @param config - Optional pool configuration
 * @returns ConnectionManager with db instance, health check, and shutdown functions
 */
export function createConnectionPool(
  connectionString: string,
  config: ConnectionPoolConfig = {}
): ConnectionManager {
  const poolConfig = { ...DEFAULT_CONFIG, ...config };

  const sql = postgres(connectionString, {
    max: poolConfig.max,
    idle_timeout: poolConfig.idleTimeout,
    connect_timeout: poolConfig.connectTimeout,
    max_lifetime: poolConfig.maxLifetime,
    onnotice: () => {}, // Suppress notice messages
  });

  const db = drizzle(sql, { schema });

  /**
   * Performs a health check by executing a simple query.
   * Returns true if the database is reachable, false otherwise.
   */
  async function healthCheck(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gracefully shuts down the connection pool.
   * Waits for active queries to complete before closing.
   */
  async function shutdown(): Promise<void> {
    await sql.end({ timeout: 5 });
  }

  return {
    db,
    sql,
    healthCheck,
    shutdown,
  };
}

/**
 * Creates a managed connection pool from DATABASE_URL environment variable.
 *
 * @param config - Optional pool configuration
 * @throws Error if DATABASE_URL is not set
 * @returns ConnectionManager with db instance, health check, and shutdown functions
 */
export function createConnectionPoolFromEnv(
  config: ConnectionPoolConfig = {}
): ConnectionManager {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return createConnectionPool(connectionString, config);
}

// Singleton instance for shared use across the application
let _connectionManager: ConnectionManager | null = null;

/**
 * Gets or creates a singleton connection manager.
 * Use this for shared database access across modules.
 *
 * @param config - Optional pool configuration (only used on first call)
 * @returns ConnectionManager singleton instance
 */
export function getConnectionManager(
  config?: ConnectionPoolConfig
): ConnectionManager {
  if (_connectionManager === null) {
    _connectionManager = createConnectionPoolFromEnv(config);
  }
  return _connectionManager;
}

/**
 * Resets the singleton connection manager.
 * Useful for testing or reconnection scenarios.
 * Does NOT call shutdown - caller should shutdown first if needed.
 */
export function resetConnectionManager(): void {
  _connectionManager = null;
}

/**
 * Registers graceful shutdown handlers for SIGTERM and SIGINT.
 * Call this once at application startup.
 *
 * @param manager - ConnectionManager to shutdown on process termination
 * @param onShutdown - Optional callback invoked after shutdown completes
 */
export function registerShutdownHandlers(
  manager: ConnectionManager,
  onShutdown?: () => void | Promise<void>
): void {
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down database connections...`);
    try {
      await manager.shutdown();
      console.log('Database connections closed');
      if (onShutdown) {
        await onShutdown();
      }
    } catch (error) {
      console.error('Error during database shutdown:', error);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}
