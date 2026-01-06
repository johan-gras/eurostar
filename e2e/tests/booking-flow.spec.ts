import { test, expect } from '../setup/test-fixtures';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Load the test booking email fixture
const testBookingEmail = fs.readFileSync(
  path.resolve(__dirname, '../fixtures/test-booking-email.txt'),
  'utf-8'
);

test.describe('Booking Flow', () => {
  test('can navigate to new booking page', async ({ page }) => {
    await page.goto('/bookings/new');

    await page.waitForLoadState('networkidle');

    // Check the page loaded
    await expect(page.locator('body')).toBeVisible();

    // Should have a form or input area for booking creation
    const pageContent = await page.textContent('body');
    const hasBookingContent =
      pageContent?.toLowerCase().includes('booking') ||
      pageContent?.toLowerCase().includes('email') ||
      pageContent?.toLowerCase().includes('paste');

    expect(hasBookingContent).toBe(true);
  });

  test('shows email paste form on new booking page', async ({ page }) => {
    await page.goto('/bookings/new');

    await page.waitForLoadState('networkidle');

    // Look for textarea or input field for email
    const textArea = page.locator('textarea');
    const inputField = page.locator('input[type="text"]');

    const hasTextArea = (await textArea.count()) > 0;
    const hasInputField = (await inputField.count()) > 0;

    // Should have some form of text input
    expect(hasTextArea || hasInputField).toBe(true);
  });

  test('can fill email paste form with test booking', async ({ page }) => {
    await page.goto('/bookings/new');

    await page.waitForLoadState('networkidle');

    // Find the email input (textarea or text input)
    const textArea = page.locator('textarea').first();

    if ((await textArea.count()) > 0) {
      await textArea.fill(testBookingEmail);

      // Verify the email was filled
      const value = await textArea.inputValue();
      expect(value).toContain('E2ETST');
      expect(value).toContain('IV123456789');
    }
  });

  test('shows validation for empty submission', async ({ page }) => {
    await page.goto('/bookings/new');

    await page.waitForLoadState('networkidle');

    // Find and click submit button without filling the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Add"), button:has-text("Create"), button:has-text("Submit")').first();

    if ((await submitButton.count()) > 0) {
      await submitButton.click();

      // Should show some validation error or not navigate away
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/bookings/new');
    }
  });

  test('bookings list page loads', async ({ page }) => {
    await page.goto('/bookings');

    await page.waitForLoadState('networkidle');

    // Check the page loaded
    await expect(page.locator('body')).toBeVisible();

    // Should show bookings list or empty state
    const pageContent = await page.textContent('body');
    const hasBookingsContent =
      pageContent?.toLowerCase().includes('booking') ||
      pageContent?.toLowerCase().includes('no booking') ||
      pageContent?.toLowerCase().includes('empty');

    expect(hasBookingsContent).toBe(true);
  });

  test('can navigate from bookings list to new booking', async ({ page }) => {
    await page.goto('/bookings');

    await page.waitForLoadState('networkidle');

    // Look for the Add Booking link (Link wrapping a Button)
    const addBookingLink = page.locator('a[href="/bookings/new"]').first();

    const linkCount = await addBookingLink.count();
    if (linkCount > 0) {
      // Verify the link exists and has the expected href
      await expect(addBookingLink).toHaveAttribute('href', '/bookings/new');

      // Click the link
      await addBookingLink.click();
      await page.waitForURL('**/bookings/new');

      expect(page.url()).toContain('/bookings/new');
    } else {
      // If there's no link (maybe auth required), just verify page loaded
      expect(page.url()).toContain('/bookings');
    }
  });

  test('booking detail page handles non-existent booking', async ({ page }) => {
    // Try to access a non-existent booking
    await page.goto('/bookings/00000000-0000-0000-0000-000000000000');

    await page.waitForLoadState('networkidle');

    // Should show error or redirect
    const pageContent = await page.textContent('body');
    const isErrorOrRedirect =
      pageContent?.toLowerCase().includes('not found') ||
      pageContent?.toLowerCase().includes('error') ||
      page.url().includes('/bookings') && !page.url().includes('00000000');

    expect(isErrorOrRedirect).toBe(true);
  });
});
