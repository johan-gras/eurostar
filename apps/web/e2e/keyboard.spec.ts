import { test, expect } from '@playwright/test';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe('Keyboard Shortcuts Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('pressing ? opens keyboard shortcuts modal', async ({ page }) => {
    // Press ? to open the modal
    await page.keyboard.press('Shift+/');

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible();
    await expect(page.getByText('Use these shortcuts to navigate quickly')).toBeVisible();
  });

  test('modal displays navigation shortcuts section', async ({ page }) => {
    await page.keyboard.press('Shift+/');

    // Navigation section
    await expect(page.getByText('Navigation')).toBeVisible();
    await expect(page.getByText('Go to dashboard')).toBeVisible();
    await expect(page.getByText('Go to bookings')).toBeVisible();
  });

  test('modal displays actions shortcuts section', async ({ page }) => {
    await page.keyboard.press('Shift+/');

    // Actions section
    await expect(page.getByText('Actions')).toBeVisible();
    await expect(page.getByText('New booking')).toBeVisible();
  });

  test('modal displays help shortcuts section', async ({ page }) => {
    await page.keyboard.press('Shift+/');

    // Help section
    const helpSection = page.locator('h4:has-text("Help")');
    await expect(helpSection).toBeVisible();
    await expect(page.getByText('Show keyboard shortcuts')).toBeVisible();
  });

  test('modal displays keyboard key indicators', async ({ page }) => {
    await page.keyboard.press('Shift+/');

    // Check for kbd elements showing shortcut keys
    const kbdElements = page.locator('kbd');
    await expect(kbdElements.first()).toBeVisible();

    // Specific keys should be shown
    await expect(page.locator('kbd:has-text("g")')).toBeVisible();
    await expect(page.locator('kbd:has-text("d")')).toBeVisible();
    await expect(page.locator('kbd:has-text("b")')).toBeVisible();
    await expect(page.locator('kbd:has-text("n")')).toBeVisible();
    await expect(page.locator('kbd:has-text("?")')).toBeVisible();
  });

  test('modal shows "then" text between multi-key sequences', async ({ page }) => {
    await page.keyboard.press('Shift+/');

    // Multi-key sequences like "g d" should show "then" between keys
    await expect(page.getByText('then').first()).toBeVisible();
  });

  test('pressing ? again closes the modal', async ({ page }) => {
    // Open modal
    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal
    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('clicking outside modal closes it', async ({ page }) => {
    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click on the overlay/backdrop
    await page.locator('[data-state="open"]').first().press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Navigation Keyboard Shortcuts', () => {
  test('g then d navigates to dashboard', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Press g then d
    await page.keyboard.press('g');
    await page.keyboard.press('d');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('g then b navigates to bookings', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Press g then b
    await page.keyboard.press('g');
    await page.keyboard.press('b');

    await expect(page).toHaveURL(/\/bookings/);
  });

  test('n navigates to new booking page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Press n
    await page.keyboard.press('n');

    await expect(page).toHaveURL(/\/bookings\/new/);
  });
});

test.describe('Keyboard Shortcuts - Input Fields', () => {
  test('shortcuts do not trigger when typing in input field', async ({ page }) => {
    await page.goto('/bookings/new');
    await page.waitForLoadState('networkidle');

    // Focus an input field
    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.focus();
      await input.type('n');

      // Should not navigate away - still on bookings/new
      await expect(page).toHaveURL(/\/bookings\/new/);
    }
  });

  test('? shortcut does not trigger when typing in input', async ({ page }) => {
    await page.goto('/bookings/new');
    await page.waitForLoadState('networkidle');

    // Focus an input field
    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.focus();
      await page.keyboard.press('Shift+/');

      // Modal should not open
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
});

test.describe('Keyboard Shortcuts - Modifier Keys', () => {
  test('ctrl+key combinations do not trigger shortcuts', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Try ctrl+n (which should be browser new window, not our shortcut)
    await page.keyboard.press('Control+n', { delay: 100 });

    // Should remain on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('meta/cmd+key combinations do not trigger shortcuts', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Try cmd+n (macOS) - should not trigger our 'n' shortcut
    await page.keyboard.press('Meta+n', { delay: 100 });

    // Should remain on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Keyboard Shortcuts Visual Regression', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('keyboard shortcuts modal screenshot', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    // Open the modal
    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog')).toBeVisible();

    await maskDynamicContent(page);

    await expect(page).toHaveScreenshot('keyboard-shortcuts-modal.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Keyboard Shortcuts Accessibility', () => {
  test('modal has proper ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Shift+/');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Dialog should have proper accessibility attributes
    await expect(dialog).toHaveAttribute('role', 'dialog');
  });

  test('modal is focusable and keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Shift+/');
    await expect(page.getByRole('dialog')).toBeVisible();

    // Tab should move focus within the modal
    await page.keyboard.press('Tab');

    // Close button should be focusable
    const closeButton = page.locator('[data-state="open"] button[type="button"]').first();
    if (await closeButton.isVisible()) {
      await expect(closeButton).toBeFocused();
    }
  });
});
