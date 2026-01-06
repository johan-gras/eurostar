import type { Page } from '@playwright/test';

/**
 * Waits for the page to be fully ready (network idle + fonts loaded)
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Masks dynamic content (timestamps, counters) before taking screenshots
 * to prevent flaky visual regression tests
 */
export async function maskDynamicContent(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Mask elements with data-testid containing 'timestamp' or 'counter'
    const dynamicSelectors = [
      '[data-testid*="timestamp"]',
      '[data-testid*="counter"]',
      '[data-testid*="date"]',
      '[data-testid*="time"]',
      'time',
    ];

    dynamicSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.visibility = 'hidden';
        }
      });
    });
  });
}
