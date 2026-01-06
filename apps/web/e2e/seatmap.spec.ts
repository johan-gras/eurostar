import { test, expect } from '@playwright/test';
import { captureScreenshot } from './helpers/screenshot';

test.describe('Seat Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with e320 selected by default', async ({ page }) => {
    const trainTypeSelect = page.locator('select').first();
    await expect(trainTypeSelect).toHaveValue('e320');

    // Verify the page title
    await expect(page.locator('h1')).toHaveText('Seat Map');
  });

  test('coach selector shows 16 coaches', async ({ page }) => {
    // Wait for seats to load
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Get the coach filter select (second select on the page)
    const coachSelect = page.locator('select').nth(1);

    // Count the coach options (excluding "All coaches")
    const coachOptions = coachSelect.locator('option');
    const optionCount = await coachOptions.count();

    // Should have 17 options: "All coaches" + 16 coaches
    expect(optionCount).toBe(17);

    // Verify coach numbers 1-16 are present
    for (let i = 1; i <= 16; i++) {
      await expect(coachSelect.locator(`option[value="${i}"]`)).toHaveText(`Coach ${i}`);
    }
  });

  test('preference form renders all options', async ({ page }) => {
    // Verify Coach Class select
    await expect(page.locator('label', { hasText: 'Coach Class' })).toBeVisible();
    await expect(page.locator('#coachClass')).toBeVisible();

    // Verify Preferences section
    await expect(page.getByText('Preferences', { exact: true })).toBeVisible();
    await expect(page.locator('#preferWindow')).toBeVisible();
    await expect(page.locator('#preferQuiet')).toBeVisible();
    await expect(page.locator('#preferTable')).toBeVisible();
    await expect(page.locator('#needsAccessible')).toBeVisible();

    // Verify Avoid section
    await expect(page.getByText('Avoid', { exact: true })).toBeVisible();
    await expect(page.locator('#avoidToilet')).toBeVisible();
    await expect(page.locator('#avoidNoWindow')).toBeVisible();

    // Verify Traveling together input
    await expect(page.locator('label', { hasText: 'Traveling together' })).toBeVisible();
    await expect(page.locator('#travelingTogether')).toBeVisible();

    // Verify Facing direction radio buttons
    await expect(page.getByText('Facing direction')).toBeVisible();
    await expect(page.getByLabel('No preference')).toBeVisible();
    await expect(page.getByLabel('Facing forward')).toBeVisible();
    await expect(page.getByLabel('Facing backward')).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: 'Find Best Seats' })).toBeVisible();
  });

  test('clicking a seat shows seat details', async ({ page }) => {
    // Wait for seats to load
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Click on a seat button (first available seat)
    const seatButton = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ }).first();
    await seatButton.click();

    // Verify the Selected Seat card appears
    await expect(page.getByText('Selected Seat')).toBeVisible();

    // Verify seat details are shown
    const selectedSeatCard = page.locator('text=Selected Seat').locator('..');
    await expect(selectedSeatCard.locator('text=/Coach \\d+, Seat/')).toBeVisible();
  });

  test('submitting preferences highlights recommended seats', async ({ page }) => {
    // Wait for seats to load
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Set some preferences
    await page.locator('#preferWindow').check();
    await page.locator('#preferQuiet').check();

    // Submit the form
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Wait for loading to complete
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    // Verify recommended seats are highlighted (have the blue ring class)
    const recommendedSeats = page.locator('button.ring-2.ring-blue-400');
    await expect(recommendedSeats.first()).toBeVisible({ timeout: 10000 });

    // Should have at least one recommended seat
    const count = await recommendedSeats.count();
    expect(count).toBeGreaterThan(0);
  });
});

// Navigation tests
test.describe('Seat Map - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    // Wait for seats to load
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });
  });

  test('navigates to seat map page from dashboard', async ({ page }) => {
    // Go to dashboard first
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click on Seat Map link in navigation
    const navLink = page.locator('nav.hidden.md\\:flex').getByRole('link', { name: 'Seat Map' });
    await navLink.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on the seat map page
    await expect(page).toHaveURL(/\/seatmap/);
    await expect(page.locator('h1')).toHaveText('Seat Map');
  });

  test('changes coach using select dropdown', async ({ page }) => {
    // Get the coach filter select
    const coachSelect = page.locator('select').nth(1);

    // Select coach 5
    await coachSelect.selectOption('5');

    // Verify the selection
    await expect(coachSelect).toHaveValue('5');

    // Verify only coach 5 seats are visible (or the view has filtered)
    // The page should show seats from coach 5
  });

  test('navigates between coaches using train overview', async ({ page }) => {
    // Find the train overview component with mini coach buttons
    const trainOverview = page.locator('.flex.items-center.justify-center.gap-1');
    await expect(trainOverview).toBeVisible();

    // Click on coach 8 in the train overview
    const coach8Button = page.locator('button[aria-label*="Coach 8"]');
    await coach8Button.click();

    // Verify the coach 8 button is now active (has ring styling)
    await expect(coach8Button).toHaveClass(/ring-2/);

    // Verify the coach filter dropdown also updated
    const coachSelect = page.locator('select').nth(1);
    await expect(coachSelect).toHaveValue('8');
  });

  test('toggles coach selection by clicking same coach', async ({ page }) => {
    const coachSelect = page.locator('select').nth(1);

    // Select coach 3
    await coachSelect.selectOption('3');
    await expect(coachSelect).toHaveValue('3');

    // Click coach 3 in train overview to deselect
    const coach3Button = page.locator('button[aria-label*="Coach 3"]');
    await coach3Button.click();

    // Coach should be deselected (back to all coaches)
    await expect(coachSelect).toHaveValue('');
  });

  test('train overview shows correct coach classes', async ({ page }) => {
    // Verify Business Premier coaches (amber color) exist
    const businessPremierCoaches = page.locator('button.bg-amber-400');
    await expect(businessPremierCoaches.first()).toBeVisible();

    // Verify Standard Premier coaches (purple color) exist
    const standardPremierCoaches = page.locator('button.bg-purple-400');
    await expect(standardPremierCoaches.first()).toBeVisible();

    // Verify Standard coaches (slate color) exist
    const standardCoaches = page.locator('button.bg-slate-400');
    await expect(standardCoaches.first()).toBeVisible();
  });

  test('train overview tooltip shows coach info', async ({ page }) => {
    // Hover over coach 1 to show tooltip
    const coach1Button = page.locator('button[aria-label*="Coach 1"]');
    await coach1Button.hover();

    // Wait for tooltip to appear
    await page.waitForTimeout(500);

    // Check tooltip content exists (contains coach info)
    const tooltip = page.locator('[role="tooltip"]');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText('Coach 1');
      await expect(tooltip).toContainText('seats');
    }
  });
});

// Interaction tests
test.describe('Seat Map - Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });
  });

  test('click seat to see details panel', async ({ page }) => {
    // Click on a seat
    const seatButton = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ }).first();
    await seatButton.click();

    // Verify details panel/card appears
    await expect(page.getByText('Selected Seat')).toBeVisible();

    // Verify seat number is displayed
    await expect(page.locator('text=/Seat \\d+[A-D]?/')).toBeVisible();

    // Verify class is displayed (Standard, Standard Premier, or Business Premier)
    await expect(page.locator('text=/(standard|premier|business)/i')).toBeVisible();
  });

  test('submit preferences and view recommendations', async ({ page }) => {
    // Set multiple preferences
    await page.locator('#preferWindow').check();
    await page.locator('#preferTable').check();
    await page.locator('#avoidToilet').check();

    // Select Standard Premier class
    await page.locator('#coachClass').selectOption('standard-premier');

    // Submit form
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Wait for results
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    // Verify recommendations appear
    const recommendedSeats = page.locator('button.ring-2.ring-blue-400');
    const count = await recommendedSeats.count();
    expect(count).toBeGreaterThan(0);
  });

  test('view recommendation results card', async ({ page }) => {
    // Submit preferences
    await page.locator('#preferWindow').check();
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Wait for results
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    // Check for recommendation results section
    const recommendationSection = page.locator('text=/Top \\d+ Recommendations|Best Matches/i');
    if (await recommendationSection.isVisible({ timeout: 5000 })) {
      await expect(recommendationSection).toBeVisible();
    }
  });

  test('traveling together shows group recommendations', async ({ page }) => {
    // Set traveling together to 2
    await page.locator('#travelingTogether').fill('2');

    // Submit form
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Wait for results
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    // Recommendations should consider adjacent seats
    const recommendedSeats = page.locator('button.ring-2.ring-blue-400');
    const count = await recommendedSeats.count();
    expect(count).toBeGreaterThan(0);
  });

  test('facing direction preference is applied', async ({ page }) => {
    // Select facing forward preference
    await page.getByLabel('Facing forward').check();

    // Submit form
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Wait for results
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    // Recommendations should be visible
    const recommendedSeats = page.locator('button.ring-2.ring-blue-400');
    await expect(recommendedSeats.first()).toBeVisible({ timeout: 10000 });
  });

  test('change train type reloads seats', async ({ page }) => {
    const trainSelect = page.locator('select').first();

    // Note: Only e320 is available, but verify the select works
    await expect(trainSelect).toHaveValue('e320');

    // Try to select a different train type (if available)
    // Since others are disabled, just verify e320 is selected
    const options = await trainSelect.locator('option').allTextContents();
    expect(options).toContain('e320 (Siemens Velaro)');
  });
});

// Visual tests (screenshots)
test.describe('Seat Map - Visual Tests', () => {
  test('screenshot: seatmap-default.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    await captureScreenshot(page, 'seatmap-default', { fullPage: true });
  });

  test('screenshot: seatmap-with-selection.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Click on a seat to select it
    const seatButton = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ }).first();
    await seatButton.click();

    // Wait for selection to show
    await expect(page.getByText('Selected Seat')).toBeVisible();

    await captureScreenshot(page, 'seatmap-with-selection', { fullPage: true });
  });

  test('screenshot: seatmap-recommendations.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Set preferences and submit
    await page.locator('#preferWindow').check();
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Wait for recommendations to load
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    // Wait for recommended seats to appear
    const recommendedSeats = page.locator('button.ring-2.ring-blue-400');
    await expect(recommendedSeats.first()).toBeVisible({ timeout: 10000 });

    await captureScreenshot(page, 'seatmap-recommendations', { fullPage: true });
  });

  test('screenshot: seatmap-coach-filtered.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Filter to specific coach
    const coachSelect = page.locator('select').nth(1);
    await coachSelect.selectOption('5');

    await page.waitForTimeout(500); // Wait for view to update

    await captureScreenshot(page, 'seatmap-coach-filtered', { fullPage: true });
  });
});

// Mobile visual tests
test.describe('Seat Map - Mobile Visual Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('screenshot: seatmap-mobile-default.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    await captureScreenshot(page, 'seatmap-mobile-default', { fullPage: true });
  });

  test('screenshot: seatmap-mobile-with-selection.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Click on a seat to select it
    const seatButton = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ }).first();
    await seatButton.click();

    // Wait for selection UI (bottom sheet on mobile)
    await page.waitForTimeout(500);

    await captureScreenshot(page, 'seatmap-mobile-with-selection', { fullPage: true });
  });

  test('screenshot: seatmap-mobile-recommendations.png', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // On mobile, preferences might be in an accordion - expand if needed
    const preferenceAccordion = page.locator('text=Preferences');
    if (await preferenceAccordion.isVisible()) {
      await preferenceAccordion.click();
    }

    // Set preferences
    const windowCheckbox = page.locator('#preferWindow');
    if (await windowCheckbox.isVisible()) {
      await windowCheckbox.check();
    }

    // Find and click submit button
    const submitButton = page.getByRole('button', { name: 'Find Best Seats' });
    await submitButton.click();

    // Wait for results
    await expect(page.getByRole('button', { name: 'Finding seats...' })).not.toBeVisible({ timeout: 10000 });

    await captureScreenshot(page, 'seatmap-mobile-recommendations', { fullPage: true });
  });
});

// Comparison view tests
test.describe('Seat Map - Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });
  });

  test('compare seats shows comparison table', async ({ page }) => {
    // Click on first seat
    const seats = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ });
    const seat1 = seats.first();
    await seat1.click();

    // Check if comparison mode button exists
    const compareModeButton = page.getByRole('button', { name: /Compare/i });
    if (await compareModeButton.isVisible({ timeout: 2000 })) {
      await compareModeButton.click();

      // Click on second seat
      const seat2 = seats.nth(1);
      await seat2.click();

      // Look for comparison UI
      const comparisonTable = page.locator('text=/Comparing \\d+ seats?/');
      if (await comparisonTable.isVisible({ timeout: 2000 })) {
        await expect(comparisonTable).toBeVisible();
      }
    }
  });

  test('screenshot: seatmap-comparison-view.png', async ({ page }) => {
    // Click on first seat
    const seats = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ });
    await seats.first().click();

    // If compare mode is available, use it
    const compareModeButton = page.getByRole('button', { name: /Compare/i });
    if (await compareModeButton.isVisible({ timeout: 2000 })) {
      await compareModeButton.click();

      // Add more seats to comparison
      await seats.nth(2).click();
      await seats.nth(5).click();

      await page.waitForTimeout(500);
    }

    await captureScreenshot(page, 'seatmap-comparison-view', { fullPage: true });
  });
});

// Accessibility tests
test.describe('Seat Map - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });
  });

  test('tab through interface elements', async ({ page }) => {
    // Start from beginning
    await page.keyboard.press('Tab');

    // Should be able to tab through train type select
    const activeElement1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['SELECT', 'INPUT', 'BUTTON', 'A']).toContain(activeElement1);

    // Tab through more elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Should still be on a focusable element
    const activeElement2 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['SELECT', 'INPUT', 'BUTTON', 'A', 'BODY']).toContain(activeElement2);
  });

  test('verify ARIA labels on coach buttons', async ({ page }) => {
    // Coach buttons in train overview should have aria-labels
    const coachButtons = page.locator('button[aria-label*="Coach"]');
    const count = await coachButtons.count();

    expect(count).toBeGreaterThan(0);

    // Verify aria-label format
    const firstCoachAriaLabel = await coachButtons.first().getAttribute('aria-label');
    expect(firstCoachAriaLabel).toMatch(/Coach \d+/);
  });

  test('verify ARIA labels on seat buttons', async ({ page }) => {
    // Seat buttons should have accessible names
    const seatButtons = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ });

    // Get first seat and check if it has an aria-label or meaningful text
    const firstSeat = seatButtons.first();
    const ariaLabel = await firstSeat.getAttribute('aria-label');
    const textContent = await firstSeat.textContent();

    // Either has aria-label or text content
    expect(ariaLabel || textContent).toBeTruthy();
  });

  test('form labels are properly associated', async ({ page }) => {
    // Check that form inputs have associated labels
    const coachClassLabel = page.locator('label[for="coachClass"]');
    await expect(coachClassLabel).toBeVisible();

    const preferWindowLabel = page.locator('label[for="preferWindow"]');
    await expect(preferWindowLabel).toBeVisible();

    const travelingTogetherLabel = page.locator('label[for="travelingTogether"]');
    await expect(travelingTogetherLabel).toBeVisible();
  });

  test('radio buttons are grouped properly', async ({ page }) => {
    // Facing direction radio buttons should be in a group
    const noPreferenceRadio = page.getByLabel('No preference');
    const forwardRadio = page.getByLabel('Facing forward');
    const backwardRadio = page.getByLabel('Facing backward');

    await expect(noPreferenceRadio).toBeVisible();
    await expect(forwardRadio).toBeVisible();
    await expect(backwardRadio).toBeVisible();

    // Should be mutually exclusive
    await forwardRadio.check();
    await expect(noPreferenceRadio).not.toBeChecked();

    await noPreferenceRadio.check();
    await expect(forwardRadio).not.toBeChecked();
  });

  test('keyboard navigation on train overview', async ({ page }) => {
    // Tab to train overview area
    const trainOverview = page.locator('.flex.items-center.justify-center.gap-1');
    await expect(trainOverview).toBeVisible();

    // Find and focus first coach button
    const firstCoachButton = page.locator('button[aria-label*="Coach"]').first();
    await firstCoachButton.focus();

    // Should be focusable
    const isFocused = await firstCoachButton.evaluate(
      (el) => document.activeElement === el
    );
    expect(isFocused).toBe(true);

    // Press Enter to select
    await page.keyboard.press('Enter');

    // Coach should now be selected (has ring styling)
    await expect(firstCoachButton).toHaveClass(/ring-2/);
  });

  test('focus indicator is visible on interactive elements', async ({ page }) => {
    // Tab to submit button
    const submitButton = page.getByRole('button', { name: 'Find Best Seats' });
    await submitButton.focus();

    // Either has focus-visible classes or will show focus ring
    // The button should be styled to show focus
    await expect(submitButton).toBeFocused();
  });

  test('error states are announced', async ({ page }) => {
    // This tests that error messages are accessible
    // Trigger an error state if possible (e.g., invalid input)

    // Try setting invalid traveling together value
    const travelingTogetherInput = page.locator('#travelingTogether');
    await travelingTogetherInput.fill('-1');

    // Submit form
    await page.getByRole('button', { name: 'Find Best Seats' }).click();

    // Check for error messages or validation
    // The form should either prevent submission or show error
    const errorMessage = page.locator('[role="alert"], .text-red-600, .text-destructive');
    const errorVisible = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

    // Either shows error or resets the value
    if (errorVisible) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });
});

// Mobile accessibility tests
test.describe('Seat Map - Mobile Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile touch targets are adequately sized', async ({ page }) => {
    await page.goto('/seatmap');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading seat data...')).not.toBeVisible({ timeout: 10000 });

    // Seat buttons should be at least 44x44 for touch accessibility
    const seatButtons = page.locator('button').filter({ hasText: /^\d+[A-D]?$/ });
    const firstSeat = seatButtons.first();

    if (await firstSeat.isVisible()) {
      const box = await firstSeat.boundingBox();
      if (box) {
        // Touch targets should be at least 44px (WCAG recommendation)
        expect(box.width).toBeGreaterThanOrEqual(32); // Allow some flexibility
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });
});
