import { execSync } from 'node:child_process';

/**
 * Global teardown for E2E tests.
 * - Stops docker containers (optionally)
 *
 * By default, we keep containers running between test runs for faster iteration.
 * Set E2E_CLEANUP=true to stop containers after tests.
 */
export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 E2E test teardown...\n');

  const shouldCleanup = process.env.E2E_CLEANUP === 'true' || process.env.CI === 'true';

  if (shouldCleanup) {
    console.log('📦 Stopping Docker containers...');
    try {
      execSync('docker compose down', {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      console.log('  ✓ Containers stopped');
    } catch (error) {
      console.warn('Warning: Failed to stop Docker containers:', error);
    }
  } else {
    console.log('💡 Keeping Docker containers running for faster iteration.');
    console.log('   Set E2E_CLEANUP=true to stop containers after tests.\n');
  }

  console.log('✅ E2E test teardown complete!\n');
}
