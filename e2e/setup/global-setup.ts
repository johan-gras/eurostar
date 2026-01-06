import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Global setup for E2E tests.
 * - Starts docker containers (postgres, redis)
 * - Waits for services to be healthy
 * - Runs database migrations
 */
export default async function globalSetup(): Promise<void> {
  console.log('\n🚀 Starting E2E test setup...\n');

  // Start docker containers
  console.log('📦 Starting Docker containers...');
  try {
    execSync('docker compose up -d', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to start Docker containers:', error);
    throw error;
  }

  // Wait for services to be healthy
  console.log('⏳ Waiting for services to be healthy...');
  await waitForHealthy('postgres', 30_000);
  await waitForHealthy('redis', 30_000);

  // Run migrations
  console.log('🗃️  Running database migrations...');
  try {
    execSync('pnpm db:migrate', {
      cwd: `${process.cwd()}/packages/core`,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://eurostar:eurostar_dev@localhost:5432/eurostar',
      },
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  console.log('\n✅ E2E test setup complete!\n');
}

/**
 * Wait for a Docker container to be healthy.
 */
async function waitForHealthy(service: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  const containerName = `eurostar-${service}`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = execSync(
        `docker inspect --format='{{.State.Health.Status}}' ${containerName}`,
        { encoding: 'utf-8' }
      ).trim();

      if (result === 'healthy') {
        console.log(`  ✓ ${service} is healthy`);
        return;
      }
    } catch {
      // Container might not exist yet or doesn't have health check
    }

    // Also try a simple connectivity check
    try {
      if (service === 'postgres') {
        execSync(
          `docker exec ${containerName} pg_isready -U eurostar -d eurostar`,
          { stdio: 'ignore' }
        );
        console.log(`  ✓ ${service} is ready`);
        return;
      } else if (service === 'redis') {
        execSync(
          `docker exec ${containerName} redis-cli ping`,
          { stdio: 'ignore' }
        );
        console.log(`  ✓ ${service} is ready`);
        return;
      }
    } catch {
      // Not ready yet
    }

    await sleep(1000);
  }

  throw new Error(`Timeout waiting for ${service} to be healthy`);
}
