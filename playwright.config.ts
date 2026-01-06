import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure global setup/teardown */
  globalSetup: './e2e/setup/global-setup.ts',
  globalTeardown: './e2e/setup/global-teardown.ts',

  /* Test timeouts */
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev servers before starting the tests */
  webServer: [
    {
      command: 'pnpm --filter @eurostar/autoclaim dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: '3001',
        DATABASE_URL: 'postgresql://eurostar:eurostar_dev@localhost:5432/eurostar',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'e2e-test-secret-key-for-testing-only',
        CORS_ORIGIN: 'http://localhost:3000',
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: 'pnpm --filter @eurostar/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      },
    },
  ],
});
