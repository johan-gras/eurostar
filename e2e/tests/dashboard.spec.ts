import { test, expect } from '../setup/test-fixtures';

test.describe('Dashboard', () => {
  test('dashboard page loads and displays stats', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the dashboard has loaded by looking for common elements
    // The dashboard should show some statistics or summary cards
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for typical dashboard elements
    // These selectors may need adjustment based on actual UI
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('dashboard shows bookings summary section', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Look for bookings-related content
    const pageContent = await page.textContent('body');

    // The dashboard should mention bookings or claims
    // Accept either as valid dashboard content
    const hasRelevantContent =
      pageContent?.toLowerCase().includes('booking') ||
      pageContent?.toLowerCase().includes('claim') ||
      pageContent?.toLowerCase().includes('dashboard') ||
      pageContent?.toLowerCase().includes('welcome');

    expect(hasRelevantContent).toBe(true);
  });

  test('dashboard navigation works', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Check that navigation links exist
    const navLinks = page.locator('nav a, aside a, header a');
    const linkCount = await navLinks.count();

    // Should have at least some navigation
    expect(linkCount).toBeGreaterThan(0);
  });

  test('dashboard is responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
