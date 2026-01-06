import { z } from 'zod';

/**
 * Environment variable schema for the application.
 * All required variables must be set for the application to start.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required')
    .url('REDIS_URL must be a valid URL'),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),

  // Email
  RESEND_API_KEY: z
    .string()
    .min(1, 'RESEND_API_KEY is required')
    .startsWith('re_', 'RESEND_API_KEY must start with "re_"'),

  // Optional variables with defaults
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3000),

  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates environment variables and returns a typed env object.
 * Throws an error with details if validation fails.
 *
 * @throws Error if required environment variables are missing or invalid
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  _env = result.data;
  return result.data;
}

/**
 * Returns the validated environment object.
 * Validates on first access if not already validated.
 *
 * @throws Error if environment validation fails
 */
export function env(): Env {
  if (_env === null) {
    _env = validateEnv();
  }
  return _env;
}

/**
 * Reset the cached environment (useful for testing).
 */
export function resetEnv(): void {
  _env = null;
}
