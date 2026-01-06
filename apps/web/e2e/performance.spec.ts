import { test, expect } from '@playwright/test';

const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Bookings', path: '/bookings' },
  { name: 'Claims', path: '/claims' },
  { name: 'Seat Map', path: '/seatmap' },
  { name: 'Queue Times', path: '/queue' },
];

test.describe('Page Load Performance', () => {
  for (const page of pages) {
    test(`${page.name} page LCP is under 2.5s`, async ({ page: playwrightPage }) => {
      // Enable performance metrics collection
      const client = await playwrightPage.context().newCDPSession(playwrightPage);
      await client.send('Performance.enable');

      // Collect LCP using PerformanceObserver
      const lcpPromise = playwrightPage.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lcpValue = 0;
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              lcpValue = lastEntry.startTime;
            }
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });

          // Wait for page to fully load, then return LCP
          window.addEventListener('load', () => {
            // Give a bit more time for LCP to be recorded
            setTimeout(() => {
              observer.disconnect();
              resolve(lcpValue);
            }, 500);
          });

          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(lcpValue);
          }, 10000);
        });
      });

      await playwrightPage.goto(page.path);
      const lcp = await lcpPromise;

      // LCP should be under 2500ms (2.5s) for good user experience
      expect(lcp, `LCP for ${page.name} page should be under 2.5s`).toBeLessThan(2500);
    });
  }
});

test.describe('Navigation Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  for (const targetPage of pages.filter((p) => p.path !== '/dashboard')) {
    test(`navigation from Dashboard to ${targetPage.name} is fast`, async ({ page }) => {
      const navLink = page.locator('nav.hidden.md\\:flex').getByRole('link', { name: targetPage.name });

      const startTime = Date.now();
      await navLink.click();
      await page.waitForLoadState('networkidle');
      const navigationTime = Date.now() - startTime;

      // Client-side navigation should be under 1 second
      expect(navigationTime, `Navigation to ${targetPage.name} should be under 1s`).toBeLessThan(1000);
    });
  }

  test('rapid navigation between pages stays responsive', async ({ page }) => {
    const navTimings: number[] = [];

    for (const targetPage of pages) {
      const navLink = page.locator('nav.hidden.md\\:flex').getByRole('link', { name: targetPage.name });

      const startTime = Date.now();
      await navLink.click();
      await page.waitForLoadState('domcontentloaded');
      const navigationTime = Date.now() - startTime;

      navTimings.push(navigationTime);
    }

    // Average navigation time should be under 500ms
    const avgTime = navTimings.reduce((a, b) => a + b, 0) / navTimings.length;
    expect(avgTime, 'Average navigation time should be under 500ms').toBeLessThan(500);

    // No single navigation should take more than 1.5s
    const maxTime = Math.max(...navTimings);
    expect(maxTime, 'Max navigation time should be under 1.5s').toBeLessThan(1500);
  });
});

test.describe('API Response Times', () => {
  test('dashboard API calls complete within acceptable time', async ({ page }) => {
    const apiTimings: { url: string; duration: number }[] = [];

    // Monitor API requests
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const timing = response.request().timing();
        apiTimings.push({
          url,
          duration: timing.responseEnd - timing.requestStart,
        });
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // All API calls should complete within 2 seconds
    for (const timing of apiTimings) {
      expect(
        timing.duration,
        `API call to ${timing.url} should complete within 2s`
      ).toBeLessThan(2000);
    }
  });

  test('bookings list API responds quickly', async ({ page }) => {
    let bookingsApiTime = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') && url.includes('booking')) {
        const timing = response.request().timing();
        bookingsApiTime = timing.responseEnd - timing.requestStart;
      }
    });

    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Bookings API should respond within 1 second
    if (bookingsApiTime > 0) {
      expect(bookingsApiTime, 'Bookings API should respond within 1s').toBeLessThan(1000);
    }
  });

  test('claims list API responds quickly', async ({ page }) => {
    let claimsApiTime = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') && url.includes('claim')) {
        const timing = response.request().timing();
        claimsApiTime = timing.responseEnd - timing.requestStart;
      }
    });

    await page.goto('/claims');
    await page.waitForLoadState('networkidle');

    // Claims API should respond within 1 second
    if (claimsApiTime > 0) {
      expect(claimsApiTime, 'Claims API should respond within 1s').toBeLessThan(1000);
    }
  });
});

test.describe('Core Web Vitals', () => {
  test('measures First Contentful Paint (FCP)', async ({ page }) => {
    await page.goto('/dashboard');

    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntriesByName('first-contentful-paint');
          if (entries.length > 0) {
            observer.disconnect();
            resolve(entries[0]!.startTime);
          }
        });
        observer.observe({ type: 'paint', buffered: true });

        // Fallback
        setTimeout(() => {
          observer.disconnect();
          const entries = performance.getEntriesByName('first-contentful-paint');
          resolve(entries[0]?.startTime ?? 0);
        }, 5000);
      });
    });

    // FCP should be under 1.8s for good user experience
    expect(fcp, 'FCP should be under 1.8s').toBeLessThan(1800);
  });

  test('measures Time to Interactive approximation', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for main interactive element to be clickable
    const mainNav = page.locator('nav.hidden.md\\:flex');
    await expect(mainNav).toBeVisible();

    const tti = Date.now() - startTime;

    // TTI should be under 3.8s
    expect(tti, 'Time to Interactive should be under 3.8s').toBeLessThan(3800);
  });

  test('measures Cumulative Layout Shift (CLS)', async ({ page }) => {
    // Set up CLS measurement before navigation
    await page.goto('/dashboard');

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
              clsValue += (entry as PerformanceEntry & { value: number }).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        // Wait and collect CLS
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    // CLS should be under 0.1 for good user experience
    expect(cls, 'CLS should be under 0.1').toBeLessThan(0.1);
  });
});

test.describe('Resource Loading', () => {
  test('total page weight is reasonable', async ({ page }) => {
    let totalBytes = 0;

    page.on('response', async (response) => {
      const headers = response.headers();
      const contentLength = headers['content-length'];
      if (contentLength) {
        totalBytes += parseInt(contentLength, 10);
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Total page weight should be under 2MB
    const totalMB = totalBytes / (1024 * 1024);
    expect(totalMB, 'Total page weight should be under 2MB').toBeLessThan(2);
  });

  test('JavaScript bundle size is acceptable', async ({ page }) => {
    let jsBytes = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js') || url.includes('.js?')) {
        const headers = response.headers();
        const contentLength = headers['content-length'];
        if (contentLength) {
          jsBytes += parseInt(contentLength, 10);
        }
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // JS bundle should be under 500KB (compressed)
    const jsKB = jsBytes / 1024;
    expect(jsKB, 'JavaScript bundle should be under 500KB').toBeLessThan(500);
  });
});
