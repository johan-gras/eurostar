import { test } from '@playwright/test';
import { captureScreenshot } from './helpers/screenshot';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

test.describe.serial('Visual Baseline Screenshots', () => {
  test('dashboard - empty state', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'dashboard-empty', { fullPage: true });
  });

  test('bookings - empty state', async ({ page }) => {
    await page.goto('/bookings');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'bookings-empty', { fullPage: true });
  });

  test('claims - empty state', async ({ page }) => {
    await page.goto('/claims');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'claims-empty', { fullPage: true });
  });

  test('seatmap - default view', async ({ page }) => {
    await page.goto('/seatmap');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'seatmap-default', { fullPage: true });
  });

  test('queue - default view', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-default', { fullPage: true });
  });
});
