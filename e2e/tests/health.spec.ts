import { test, expect } from '@playwright/test';

test.describe('Health Checks', () => {
  test('API health endpoint returns ok', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.version).toBeDefined();
  });

  test('API readiness endpoint returns healthy status', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health/ready');

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(['ok', 'degraded']).toContain(body.status);
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBe(true);
  });

  test('Web app loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check the page loaded (should have some content)
    await expect(page).toHaveTitle(/Eurostar/i);
  });

  test('Web app dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');

    // The dashboard should load (might redirect to login or show content)
    await expect(page.locator('body')).toBeVisible();
  });
});
