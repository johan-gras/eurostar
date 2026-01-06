import { test, expect } from '@playwright/test';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe('Help & FAQ Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
  });

  test('has correct page title and header', async ({ page }) => {
    await expect(page).toHaveTitle(/Help/);
    await expect(page.getByRole('heading', { name: 'Help & FAQ' })).toBeVisible();
  });

  test('FAQ section renders', async ({ page }) => {
    await expect(page.getByText('Frequently Asked Questions')).toBeVisible();
    await expect(page.getByText('Find answers to common questions about Eurostar Tools')).toBeVisible();
  });

  test('search input is visible and functional', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search FAQs...');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('compensation');
    await searchInput.press('Enter');

    // Results count should appear
    await expect(page.getByText(/\d+ results? found/)).toBeVisible();
  });

  test('search filters FAQ results', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search FAQs...');
    await searchInput.fill('delay');

    // Should show filtered results
    await expect(page.getByText(/\d+ results? found/)).toBeVisible();

    // Clear search
    await searchInput.clear();

    // Results count should disappear
    await expect(page.getByText(/\d+ results? found/)).not.toBeVisible();
  });

  test('search with no results shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search FAQs...');
    await searchInput.fill('xyznonexistentquery123');

    await expect(page.getByText('No FAQs match your search.')).toBeVisible();
    await expect(page.getByText('Try different keywords or clear the filter.')).toBeVisible();
  });
});

test.describe('Help Category Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
  });

  test('category filter badges are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' }).or(page.locator('text=All').first())).toBeVisible();
    await expect(page.getByText('AutoClaim')).toBeVisible();
    await expect(page.getByText('Seat Map')).toBeVisible();
    await expect(page.getByText('Queue Times')).toBeVisible();
    await expect(page.getByText('General')).toBeVisible();
  });

  test('clicking AutoClaim filter shows only AutoClaim FAQs', async ({ page }) => {
    const autoClaimBadge = page.locator('[class*="Badge"]').filter({ hasText: 'AutoClaim' });
    await autoClaimBadge.click();

    // Should show AutoClaim questions
    await expect(page.getByText('How does AutoClaim work?')).toBeVisible();
    await expect(page.getByText('What delays qualify for compensation?')).toBeVisible();
  });

  test('clicking Seat Map filter shows only Seat Map FAQs', async ({ page }) => {
    const seatMapBadge = page.locator('[class*="Badge"]').filter({ hasText: 'Seat Map' });
    await seatMapBadge.click();

    // Should show Seat Map questions
    await expect(page.getByText('How do seat recommendations work?')).toBeVisible();
    await expect(page.getByText('What Eurostar train types are supported?')).toBeVisible();
  });

  test('clicking Queue Times filter shows only Queue FAQs', async ({ page }) => {
    const queueBadge = page.locator('[class*="Badge"]').filter({ hasText: 'Queue Times' });
    await queueBadge.click();

    // Should show Queue questions
    await expect(page.getByText('How are queue predictions calculated?')).toBeVisible();
    await expect(page.getByText('How accurate are the queue predictions?')).toBeVisible();
  });

  test('clicking General filter shows only General FAQs', async ({ page }) => {
    const generalBadge = page.locator('[class*="Badge"]').filter({ hasText: 'General' });
    await generalBadge.click();

    // Should show General questions
    await expect(page.getByText('Is my booking data secure?')).toBeVisible();
    await expect(page.getByText('How do I delete my account?')).toBeVisible();
  });

  test('clicking All filter shows all FAQs', async ({ page }) => {
    // First filter to a category
    const autoClaimBadge = page.locator('[class*="Badge"]').filter({ hasText: 'AutoClaim' });
    await autoClaimBadge.click();

    // Then click All
    const allBadge = page.locator('[class*="Badge"]').filter({ hasText: 'All' });
    await allBadge.click();

    // Should show FAQs from all categories
    await expect(page.getByText('How does AutoClaim work?')).toBeVisible();
    await expect(page.getByText('How do seat recommendations work?')).toBeVisible();
    await expect(page.getByText('How are queue predictions calculated?')).toBeVisible();
    await expect(page.getByText('Is my booking data secure?')).toBeVisible();
  });

  test('category filter combined with search', async ({ page }) => {
    // Filter by category first
    const autoClaimBadge = page.locator('[class*="Badge"]').filter({ hasText: 'AutoClaim' });
    await autoClaimBadge.click();

    // Then search within that category
    const searchInput = page.getByPlaceholder('Search FAQs...');
    await searchInput.fill('claim');

    // Results should be filtered by both
    await expect(page.getByText(/\d+ results? found/)).toBeVisible();
  });
});

test.describe('Help Accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
  });

  test('FAQ accordion items are collapsed by default', async ({ page }) => {
    // The answer text should not be visible initially
    const firstQuestion = page.locator('[data-state="closed"]').first();
    await expect(firstQuestion).toBeVisible();
  });

  test('clicking accordion trigger expands content', async ({ page }) => {
    // Click on a specific FAQ question
    const questionTrigger = page.getByText('How does AutoClaim work?');
    await questionTrigger.click();

    // The answer should now be visible
    await expect(
      page.getByText('AutoClaim monitors your booked Eurostar journeys for delays')
    ).toBeVisible();
  });

  test('clicking expanded accordion trigger collapses it', async ({ page }) => {
    const questionTrigger = page.getByText('How does AutoClaim work?');

    // Expand
    await questionTrigger.click();
    await expect(
      page.getByText('AutoClaim monitors your booked Eurostar journeys for delays')
    ).toBeVisible();

    // Collapse
    await questionTrigger.click();
    await expect(
      page.getByText('AutoClaim monitors your booked Eurostar journeys for delays')
    ).not.toBeVisible();
  });

  test('only one accordion item is expanded at a time', async ({ page }) => {
    // Expand first question
    const firstQuestion = page.getByText('How does AutoClaim work?');
    await firstQuestion.click();

    // Expand second question
    const secondQuestion = page.getByText('What delays qualify for compensation?');
    await secondQuestion.click();

    // First answer should be collapsed
    await expect(
      page.getByText('AutoClaim monitors your booked Eurostar journeys for delays')
    ).not.toBeVisible();

    // Second answer should be visible
    await expect(
      page.getByText('Under EU261 and UK regulations, delays of 60 minutes or more')
    ).toBeVisible();
  });
});

test.describe('Help Contact Support Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
  });

  test('contact support section is visible', async ({ page }) => {
    await expect(page.getByText('Still need help?')).toBeVisible();
    await expect(
      page.getByText("Can't find what you're looking for? Our support team is here to help.")
    ).toBeVisible();
  });

  test('support email link is visible and correct', async ({ page }) => {
    const emailLink = page.locator('a[href="mailto:support@eurostar.tools"]');
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveText('support@eurostar.tools');
  });
});

test.describe('Help Visual Regression', () => {
  test.describe('Desktop (1280x720)', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test('help page screenshot comparison', async ({ page }) => {
      await page.goto('/help');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('help-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('help page with expanded FAQ screenshot', async ({ page }) => {
      await page.goto('/help');
      await waitForPageReady(page);

      // Expand an accordion item
      await page.getByText('How does AutoClaim work?').click();
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('help-expanded-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('help page with search results screenshot', async ({ page }) => {
      await page.goto('/help');
      await waitForPageReady(page);

      const searchInput = page.getByPlaceholder('Search FAQs...');
      await searchInput.fill('compensation');
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('help-search-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });

  test.describe('Mobile (375x667)', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test('help page screenshot comparison', async ({ page }) => {
      await page.goto('/help');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('help-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('help page with category filter screenshot', async ({ page }) => {
      await page.goto('/help');
      await waitForPageReady(page);

      // Apply a filter
      const autoClaimBadge = page.locator('[class*="Badge"]').filter({ hasText: 'AutoClaim' });
      await autoClaimBadge.click();
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('help-filtered-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });
});
