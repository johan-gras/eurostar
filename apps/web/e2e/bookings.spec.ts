import { test, expect } from '@playwright/test';
import { captureScreenshot } from './helpers/screenshot';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe('Bookings', () => {
  test.describe('Bookings Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');
    });

    test('page loads with empty state', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();
      await expect(page.getByText('Manage your Eurostar journey bookings')).toBeVisible();

      // Empty state message
      await expect(page.getByText('No bookings yet')).toBeVisible();
      await expect(
        page.getByText('Add your first booking to start tracking delays and claiming compensation.')
      ).toBeVisible();
    });

    test('Add Booking button opens new booking page', async ({ page }) => {
      const addBookingButton = page.getByRole('link', { name: /Add Booking/i });

      await expect(addBookingButton).toBeVisible();
      await addBookingButton.click();

      await expect(page).toHaveURL(/\/bookings\/new/);
      await expect(page.getByRole('heading', { name: 'Add New Booking' })).toBeVisible();
    });
  });

  test.describe('Add Booking Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/bookings/new');
      await page.waitForLoadState('networkidle');
    });

    test('form has email paste tab by default', async ({ page }) => {
      await expect(page.getByRole('tab', { name: 'Paste Email' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Manual Entry' })).toBeVisible();

      // Email tab is active by default
      await expect(page.getByRole('tab', { name: 'Paste Email' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByPlaceholder('Paste your Eurostar confirmation email here...')).toBeVisible();
    });

    test('manual entry tab has required fields', async ({ page }) => {
      // Switch to manual entry tab
      await page.getByRole('tab', { name: 'Manual Entry' }).click();

      // Required fields (marked with *)
      await expect(page.getByLabel('PNR (Booking Reference) *')).toBeVisible();
      await expect(page.getByLabel('TCN (Ticket Control Number) *')).toBeVisible();
      await expect(page.getByLabel('Train Number *')).toBeVisible();
      await expect(page.getByLabel('Journey Date *')).toBeVisible();
      await expect(page.getByLabel('Passenger Name *')).toBeVisible();
      await expect(page.getByLabel('Origin Station Code *')).toBeVisible();
      await expect(page.getByLabel('Destination Station Code *')).toBeVisible();

      // Optional fields
      await expect(page.getByLabel('Coach (Optional)')).toBeVisible();
      await expect(page.getByLabel('Seat (Optional)')).toBeVisible();
    });

    test('form validation shows error for missing fields', async ({ page }) => {
      // Switch to manual entry tab
      await page.getByRole('tab', { name: 'Manual Entry' }).click();

      // Try to submit empty form
      await page.getByRole('button', { name: 'Add Booking' }).click();

      // Toast should show validation error
      await expect(page.getByText('Missing fields')).toBeVisible();
      await expect(page.getByText('Please fill in all required fields')).toBeVisible();
    });

    test('form validation for invalid PNR format', async ({ page }) => {
      // Switch to manual entry tab
      await page.getByRole('tab', { name: 'Manual Entry' }).click();

      // Fill in form with invalid PNR (too short, lowercase)
      await page.getByLabel('PNR (Booking Reference) *').fill('ab');
      await page.getByLabel('TCN (Ticket Control Number) *').fill('IV123456789');
      await page.getByLabel('Train Number *').fill('9024');
      await page.getByLabel('Journey Date *').fill('2025-03-15');
      await page.getByLabel('Passenger Name *').fill('John Smith');
      await page.getByLabel('Origin Station Code *').fill('GBSPX');
      await page.getByLabel('Destination Station Code *').fill('FRPLY');

      await page.getByRole('button', { name: 'Add Booking' }).click();

      // Server-side validation should reject invalid PNR
      // Note: The form will submit and the API will return an error
      await expect(page.getByText(/Failed to add booking|Invalid/i)).toBeVisible({ timeout: 10000 });
    });

    test('Back to Bookings button navigates back', async ({ page }) => {
      const backButton = page.getByRole('link', { name: /Back to Bookings/i });

      await expect(backButton).toBeVisible();
      await backButton.click();

      await expect(page).toHaveURL(/\/bookings$/);
    });
  });
});

test.describe('Bookings Visual Regression', () => {
  test.describe('Desktop (1280x720)', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test('empty state screenshot comparison', async ({ page }) => {
      await page.goto('/bookings');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-empty-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('add booking dialog - email tab screenshot', async ({ page }) => {
      await page.goto('/bookings/new');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-add-email-tab-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('add booking dialog - manual entry tab screenshot', async ({ page }) => {
      await page.goto('/bookings/new');
      await waitForPageReady(page);

      await page.getByRole('tab', { name: 'Manual Entry' }).click();
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-add-manual-tab-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('validation errors screenshot', async ({ page }) => {
      await page.goto('/bookings/new');
      await waitForPageReady(page);

      // Switch to manual entry tab and trigger validation
      await page.getByRole('tab', { name: 'Manual Entry' }).click();
      await page.getByRole('button', { name: 'Add Booking' }).click();

      // Wait for validation message
      await expect(page.getByText('Missing fields')).toBeVisible();
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-validation-errors-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });

  test.describe('Mobile (375x667)', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test('empty state screenshot comparison', async ({ page }) => {
      await page.goto('/bookings');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-empty-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('add booking dialog - email tab screenshot', async ({ page }) => {
      await page.goto('/bookings/new');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-add-email-tab-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('add booking dialog - manual entry tab screenshot', async ({ page }) => {
      await page.goto('/bookings/new');
      await waitForPageReady(page);

      await page.getByRole('tab', { name: 'Manual Entry' }).click();
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-add-manual-tab-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('validation errors screenshot', async ({ page }) => {
      await page.goto('/bookings/new');
      await waitForPageReady(page);

      await page.getByRole('tab', { name: 'Manual Entry' }).click();
      await page.getByRole('button', { name: 'Add Booking' }).click();

      await expect(page.getByText('Missing fields')).toBeVisible();
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('bookings-validation-errors-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });
});

test.describe('Bookings Screenshot Capture', () => {
  test('captures empty bookings page at desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/bookings');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-empty', { fullPage: true });
  });

  test('captures empty bookings page at mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/bookings');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-empty', { fullPage: true });
  });

  test('captures add booking dialog at desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/bookings/new');
    await waitForPageReady(page);
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-add-dialog', { fullPage: true });
  });

  test('captures add booking dialog at mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/bookings/new');
    await waitForPageReady(page);
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-add-dialog', { fullPage: true });
  });

  test('captures validation errors at desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/bookings/new');
    await waitForPageReady(page);
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    await page.getByRole('button', { name: 'Add Booking' }).click();
    await expect(page.getByText('Missing fields')).toBeVisible();
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-validation-errors', { fullPage: true });
  });

  test('captures validation errors at mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/bookings/new');
    await waitForPageReady(page);
    await page.getByRole('tab', { name: 'Manual Entry' }).click();
    await page.getByRole('button', { name: 'Add Booking' }).click();
    await expect(page.getByText('Missing fields')).toBeVisible();
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-validation-errors', { fullPage: true });
  });
});
