import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('redirects to /dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Dashboard', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
