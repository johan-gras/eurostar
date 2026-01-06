import { test as base, expect } from '@playwright/test';

/**
 * Test user information.
 */
export const TEST_USER = {
  id: 'e2e-test-user-id',
  email: 'e2e-test@example.com',
};

/**
 * Create a JWT token for testing.
 * Note: This creates a simple JWT for E2E testing.
 * The API accepts this when JWT_SECRET is set.
 */
export function createTestToken(userId: string, email: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const body = Buffer.from(
    JSON.stringify({
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
  ).toString('base64url');

  // For E2E tests with JWT_SECRET set, we need proper signature
  // But for development, this fake signature works with the decode fallback
  const signature = Buffer.from('e2e-test-signature').toString('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Extended test fixture with authentication.
 */
export const test = base.extend<{
  authenticatedPage: typeof base.prototype.page;
  apiUrl: string;
}>({
  apiUrl: 'http://localhost:3001',

  authenticatedPage: async ({ page, apiUrl }, use) => {
    const token = createTestToken(TEST_USER.id, TEST_USER.email);

    // Set the auth token in localStorage/cookies before navigating
    await page.addInitScript((authToken) => {
      localStorage.setItem('auth_token', authToken);
    }, token);

    // Also intercept API requests to add the Authorization header
    await page.route(`${apiUrl}/**`, async (route) => {
      const headers = {
        ...route.request().headers(),
        Authorization: `Bearer ${token}`,
      };
      await route.continue({ headers });
    });

    await use(page);
  },
});

export { expect };
