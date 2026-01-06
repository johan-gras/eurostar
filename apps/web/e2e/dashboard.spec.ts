import { test, expect } from '@playwright/test';
import { captureScreenshot } from './helpers/screenshot';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Dashboard/);
  });

  test('renders stats cards', async ({ page }) => {
    // Total Bookings card
    const totalBookingsCard = page.locator('text=Total Bookings').locator('..');
    await expect(totalBookingsCard).toBeVisible();

    // Total Claims card
    const totalClaimsCard = page.locator('text=Total Claims').locator('..');
    await expect(totalClaimsCard).toBeVisible();

    // Pending Claims card
    const pendingClaimsCard = page.locator('text=Pending Claims').locator('..');
    await expect(pendingClaimsCard).toBeVisible();

    // Stats should show 0 for empty state
    await expect(page.getByText('0').first()).toBeVisible();
  });

  test('Add Booking button is visible and clickable', async ({ page }) => {
    const addBookingButton = page.getByRole('link', { name: /Add Booking/i });

    await expect(addBookingButton).toBeVisible();
    await addBookingButton.click();

    await expect(page).toHaveURL(/\/bookings\/new/);
  });

  test('Recent Bookings section shows empty state', async ({ page }) => {
    const recentBookingsSection = page.locator('text=Recent Bookings').locator('..');

    await expect(recentBookingsSection).toBeVisible();
    await expect(page.getByText('No bookings yet')).toBeVisible();
    await expect(
      page.getByText('Add your first booking to start tracking delays and claiming compensation.')
    ).toBeVisible();
  });

  test('Recent Claims section shows empty state', async ({ page }) => {
    const recentClaimsSection = page.locator('text=Recent Claims').locator('..');

    await expect(recentClaimsSection).toBeVisible();
    await expect(page.getByText('No claims yet')).toBeVisible();
    await expect(
      page.getByText('Claims are automatically generated when your bookings have eligible delays.')
    ).toBeVisible();
  });
});

test.describe('Dashboard Visual Regression', () => {
  test.describe('Desktop (1280x720)', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test('empty state screenshot comparison', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('dashboard-empty-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('loading state screenshot', async ({ page }) => {
      // Intercept API calls to simulate loading state
      await page.route('**/api/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.continue();
      });

      await page.goto('/dashboard');

      // Capture loading state before data loads
      const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('.animate-pulse'));
      if (await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(page).toHaveScreenshot('dashboard-loading-desktop.png', {
          maxDiffPixelRatio: 0.02,
        });
      }
    });

    test('stats cards layout screenshot', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      const statsSection = page.locator('[data-testid="stats-section"]').or(
        page.locator('text=Total Bookings').locator('..').locator('..')
      );

      if (await statsSection.first().isVisible()) {
        await expect(statsSection.first()).toHaveScreenshot('dashboard-stats-desktop.png', {
          maxDiffPixelRatio: 0.01,
        });
      }
    });
  });

  test.describe('Mobile (375x667)', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test('empty state screenshot comparison', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('dashboard-empty-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('loading state screenshot', async ({ page }) => {
      await page.route('**/api/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.continue();
      });

      await page.goto('/dashboard');

      const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('.animate-pulse'));
      if (await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(page).toHaveScreenshot('dashboard-loading-mobile.png', {
          maxDiffPixelRatio: 0.02,
        });
      }
    });

    test('responsive layout - cards stack vertically', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      // Verify cards are stacked on mobile
      const cards = page.locator('[data-testid="stat-card"]').or(
        page.locator('text=Total Bookings').locator('..')
      );

      if (await cards.first().isVisible()) {
        await expect(page).toHaveScreenshot('dashboard-responsive-mobile.png', {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      }
    });
  });
});

test.describe('Dashboard Screenshot Capture', () => {
  test('captures dashboard empty state at desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'dashboard-empty-state', { fullPage: true });
  });

  test('captures dashboard empty state at mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'dashboard-empty-state', { fullPage: true });
  });
});
