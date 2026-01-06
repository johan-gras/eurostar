import type { Page, Locator } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScreenshotOptions {
  /** Capture full scrollable page instead of viewport only */
  fullPage?: boolean;
  /** Clip region to capture */
  clip?: { x: number; y: number; width: number; height: number };
  /** Locators to mask (for dynamic content) */
  mask?: Locator[];
}

type Viewport = 'desktop' | 'mobile';

/**
 * Determines viewport type based on page width
 */
function getViewportSuffix(page: Page): Viewport {
  const viewportSize = page.viewportSize();
  if (!viewportSize) return 'desktop';
  return viewportSize.width < 768 ? 'mobile' : 'desktop';
}

/**
 * Captures a screenshot and saves it to e2e/screenshots/{name}-{viewport}.png
 *
 * @param page - Playwright page instance
 * @param name - Base name for the screenshot file
 * @param options - Screenshot options
 */
export async function captureScreenshot(
  page: Page,
  name: string,
  options: ScreenshotOptions = {}
): Promise<string> {
  const { fullPage = false, clip, mask } = options;

  const viewport = getViewportSuffix(page);
  const filename = `${name}-${viewport}.png`;
  const screenshotPath = path.join(__dirname, '..', 'screenshots', filename);

  await page.screenshot({
    path: screenshotPath,
    fullPage,
    ...(clip && { clip }),
    ...(mask && { mask }),
  });

  return screenshotPath;
}
