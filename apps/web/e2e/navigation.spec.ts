import { test, expect } from '@playwright/test';
import { captureScreenshot } from './helpers/screenshot';

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Bookings', href: '/bookings' },
  { name: 'Claims', href: '/claims' },
  { name: 'Seat Map', href: '/seatmap' },
  { name: 'Queue Times', href: '/queue' },
];

test.describe('Desktop Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  for (const item of navItems) {
    test(`navigates to ${item.name} page`, async ({ page }) => {
      const navLink = page.locator('nav.hidden.md\\:flex').getByRole('link', { name: item.name });
      await navLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(new RegExp(item.href));
      await captureScreenshot(page, `nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    });
  }

  test('highlights active page in navigation', async ({ page }) => {
    for (const item of navItems) {
      await page.goto(item.href);
      await page.waitForLoadState('networkidle');

      const navLink = page.locator('nav.hidden.md\\:flex').getByRole('link', { name: item.name });

      // Active link should have text-foreground class (not text-foreground/60)
      await expect(navLink).toHaveClass(/text-foreground(?!\/)/);
    }
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('opens and closes mobile menu', async ({ page }) => {
    const menuButton = page.getByRole('button').filter({ has: page.locator('svg') });
    const mobileNav = page.locator('nav.md\\:hidden');

    // Menu should be closed initially
    await expect(mobileNav).not.toBeVisible();

    // Open menu
    await menuButton.click();
    await expect(mobileNav).toBeVisible();
    await captureScreenshot(page, 'nav-mobile-menu-open');

    // Close menu
    await menuButton.click();
    await expect(mobileNav).not.toBeVisible();
  });

  for (const item of navItems) {
    test(`mobile nav: navigates to ${item.name} page`, async ({ page }) => {
      // Open mobile menu
      const menuButton = page.getByRole('button').filter({ has: page.locator('svg') });
      await menuButton.click();

      const mobileNav = page.locator('nav.md\\:hidden');
      await expect(mobileNav).toBeVisible();

      // Click nav link in mobile menu
      const navLink = mobileNav.getByRole('link', { name: item.name });
      await navLink.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to correct page
      await expect(page).toHaveURL(new RegExp(item.href));

      // Mobile menu should close after navigation
      await expect(mobileNav).not.toBeVisible();

      await captureScreenshot(page, `nav-mobile-${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    });
  }

  test('highlights active page in mobile navigation', async ({ page }) => {
    for (const item of navItems) {
      await page.goto(item.href);
      await page.waitForLoadState('networkidle');

      // Open mobile menu
      const menuButton = page.getByRole('button').filter({ has: page.locator('svg') });
      await menuButton.click();

      const mobileNav = page.locator('nav.md\\:hidden');
      const navLink = mobileNav.getByRole('link', { name: item.name });

      // Active link should have text-foreground class (not text-foreground/60)
      await expect(navLink).toHaveClass(/text-foreground(?!\/)/);

      // Close menu for next iteration
      await menuButton.click();
    }
  });
});
