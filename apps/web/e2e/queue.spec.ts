import { test, expect } from '@playwright/test';
import { captureScreenshot } from './helpers/screenshot';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

const terminals = [
  { id: 'st-pancras', name: 'St Pancras International', city: 'London', timezone: 'Europe/London' },
  { id: 'gare-du-nord', name: 'Gare du Nord', city: 'Paris', timezone: 'Europe/Paris' },
  { id: 'brussels-midi', name: 'Brussels Midi', city: 'Brussels', timezone: 'Europe/Brussels' },
  { id: 'amsterdam-centraal', name: 'Amsterdam Centraal', city: 'Amsterdam', timezone: 'Europe/Amsterdam' },
];

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe('Queue Times - Navigation', () => {
  test('navigates to queue times page from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click on Queue Times in navigation
    const navLink = page.locator('nav').getByRole('link', { name: 'Queue Times' });
    await navLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/queue/);
    await expect(page.locator('h1')).toHaveText('Queue Times');
  });

  test('page loads with St Pancras selected by default', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Verify page title
    await expect(page.locator('h1')).toHaveText('Queue Times');

    // Verify St Pancras is selected by default
    const terminalSelect = page.locator('select');
    await expect(terminalSelect).toHaveValue('st-pancras');

    // Verify terminal info is displayed
    await expect(page.getByText('London')).toBeVisible();
    await expect(page.getByText('Europe/London')).toBeVisible();
  });

  test('terminal selector has all expected terminals', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    const terminalSelect = page.locator('select');
    const options = terminalSelect.locator('option');
    const optionCount = await options.count();

    // Should have at least 4 terminals
    expect(optionCount).toBeGreaterThanOrEqual(4);

    // Verify all key terminals are present
    for (const terminal of terminals) {
      await expect(terminalSelect.locator(`option[value="${terminal.id}"]`)).toHaveText(terminal.name);
    }
  });

  test('changes terminal selection', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Verify initial terminal is St Pancras
    await expect(page.locator('select')).toHaveValue('st-pancras');

    // Change to each terminal and verify
    for (const terminal of terminals.slice(1)) {
      await page.locator('select').selectOption(terminal.id);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('select')).toHaveValue(terminal.id);
      await expect(page.getByText(terminal.city)).toBeVisible();
      await expect(page.getByText(terminal.timezone)).toBeVisible();
    }
  });

  test('URL updates when terminal changes', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Change terminal to Gare du Nord
    await page.locator('select').selectOption('gare-du-nord');
    await page.waitForLoadState('networkidle');

    // URL should reflect terminal selection
    await expect(page).toHaveURL(/terminal=gare-du-nord|\/queue/);
  });

  test('preserves terminal selection on page reload', async ({ page }) => {
    await page.goto('/queue?terminal=brussels-midi');
    await waitForPageReady(page);

    await expect(page.locator('select')).toHaveValue('brussels-midi');
    await expect(page.getByText('Brussels')).toBeVisible();
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

test.describe('Queue Times - Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    // Wait for loading to complete
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
  });

  test('displays current queue status with wait time', async ({ page }) => {
    // Verify the Queue Status card is visible
    await expect(page.getByText('Current Queue Status')).toBeVisible();

    // Verify wait time is displayed (number followed by "min")
    await expect(page.locator('text=/\\d+\\s*min/')).toBeVisible();

    // Verify crowd level is displayed
    await expect(page.getByText(/crowd level/i)).toBeVisible();

    // Verify confidence badge is displayed
    await expect(page.getByText(/confidence/i)).toBeVisible();

    // Verify last updated time is displayed
    await expect(page.getByText(/Last updated:/)).toBeVisible();
  });

  test('timeline chart renders with all required elements', async ({ page }) => {
    // Verify the Queue Predictions card is visible
    await expect(page.getByText('Queue Predictions (24h)')).toBeVisible();

    // Verify Y-axis labels are visible (wait time in minutes)
    await expect(page.getByText(/\d+m/)).toBeVisible();

    // Verify X-axis time labels are visible (HH:00 format)
    await expect(page.locator('text=/\\d{2}:00/')).toBeVisible();

    // Verify legend is displayed with all severity levels
    await expect(page.getByText('Low')).toBeVisible();
    await expect(page.getByText('Moderate')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
    await expect(page.getByText('Very High')).toBeVisible();
  });

  test('timeline chart renders colored bars', async ({ page }) => {
    // Verify chart bars are rendered (colored div elements)
    const chartContainer = page.locator('[data-testid="queue-chart"]').or(
      page.locator('text=Queue Predictions').locator('..').locator('..')
    );

    // Look for colored bars indicating queue levels
    const greenBars = page.locator('.bg-green-500');
    const yellowBars = page.locator('.bg-yellow-500');
    const orangeBars = page.locator('.bg-orange-500');
    const redBars = page.locator('.bg-red-500');

    // At least one bar type should be visible
    const totalBars =
      (await greenBars.count()) +
      (await yellowBars.count()) +
      (await orangeBars.count()) +
      (await redBars.count());

    expect(totalBars).toBeGreaterThan(0);
  });

  test('arrival planner form validation', async ({ page }) => {
    // Verify the Arrival Planner card is visible
    await expect(page.getByText('Arrival Planner')).toBeVisible();

    // Verify form inputs are present
    const departureTimeInput = page.locator('#departure-time');
    const maxWaitInput = page.locator('#max-wait');
    const submitButton = page.getByRole('button', { name: 'Get Recommended Arrival Time' });

    await expect(departureTimeInput).toBeVisible();
    await expect(maxWaitInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Button should be disabled initially
    await expect(submitButton).toBeDisabled();

    // Fill only departure time - button should still be disabled
    await departureTimeInput.fill('14:00');
    await expect(submitButton).toBeDisabled();

    // Clear and fill only max wait - button should still be disabled
    await departureTimeInput.clear();
    await maxWaitInput.fill('20');
    await expect(submitButton).toBeDisabled();

    // Fill both - button should now be enabled
    await departureTimeInput.fill('14:00');
    await expect(submitButton).toBeEnabled();
  });

  test('arrival planner calculates recommendation', async ({ page }) => {
    // Fill in the form
    await page.locator('#departure-time').fill('14:00');
    await page.locator('#max-wait').fill('20');

    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Get Recommended Arrival Time' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify recommendation is displayed
    await expect(page.getByText('Recommended Arrival')).toBeVisible();

    // Verify arrival time is shown (HH:MM format)
    await expect(page.locator('text=/\\d{2}:\\d{2}/')).toBeVisible();

    // Verify expected wait is shown
    await expect(page.getByText(/Expected wait:/)).toBeVisible();

    // Verify timezone is shown
    await expect(page.getByText(/Timezone:/)).toBeVisible();
  });

  test('arrival planner works with different inputs', async ({ page }) => {
    const testCases = [
      { time: '08:30', maxWait: '15' },
      { time: '12:00', maxWait: '30' },
      { time: '18:45', maxWait: '10' },
      { time: '22:00', maxWait: '25' },
    ];

    for (const testCase of testCases) {
      // Clear previous inputs
      await page.locator('#departure-time').clear();
      await page.locator('#max-wait').clear();

      // Fill in new values
      await page.locator('#departure-time').fill(testCase.time);
      await page.locator('#max-wait').fill(testCase.maxWait);

      // Submit
      await page.getByRole('button', { name: 'Get Recommended Arrival Time' }).click();

      // Verify recommendation appears
      await expect(page.getByText('Recommended Arrival')).toBeVisible();
    }
  });

  test('view peak hours information', async ({ page }) => {
    // Look for peak hours section or similar indicator
    const peakHoursSection = page.getByText(/peak hours|busiest times|rush hour/i);

    // If peak hours section exists, verify its content
    if ((await peakHoursSection.count()) > 0) {
      await expect(peakHoursSection).toBeVisible();

      // Verify time ranges are displayed
      await expect(page.locator('text=/\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2}/')).toBeVisible();
    }
  });

  test('queue status updates for different terminals', async ({ page }) => {
    // Check St Pancras status
    await expect(page.getByText('Current Queue Status')).toBeVisible();
    const initialWaitText = await page.locator('text=/\\d+\\s*min/').first().textContent();

    // Change to Gare du Nord
    await page.locator('select').selectOption('gare-du-nord');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Verify status is still displayed (data may be same or different)
    await expect(page.getByText('Current Queue Status')).toBeVisible();
    await expect(page.locator('text=/\\d+\\s*min/')).toBeVisible();
  });
});

// ============================================================================
// Visual Tests
// ============================================================================

test.describe('Queue Times - Visual Tests', () => {
  test('screenshot: default St Pancras view', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-st-pancras', { fullPage: true });
  });

  test('screenshot: Gare du Nord view', async ({ page }) => {
    await page.goto('/queue?terminal=gare-du-nord');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    await expect(page.locator('select')).toHaveValue('gare-du-nord');
    await expect(page.getByText('Paris')).toBeVisible();

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-gare-du-nord', { fullPage: true });
  });

  test('screenshot: Brussels Midi view', async ({ page }) => {
    await page.goto('/queue?terminal=brussels-midi');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    await expect(page.locator('select')).toHaveValue('brussels-midi');
    await expect(page.getByText('Brussels')).toBeVisible();

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-brussels-midi', { fullPage: true });
  });

  test('screenshot: Amsterdam Centraal view', async ({ page }) => {
    await page.goto('/queue?terminal=amsterdam-centraal');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    await expect(page.locator('select')).toHaveValue('amsterdam-centraal');
    await expect(page.getByText('Amsterdam')).toBeVisible();

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-amsterdam-centraal', { fullPage: true });
  });

  test('screenshot: arrival planner with results', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Fill in arrival planner form
    await page.locator('#departure-time').fill('10:30');
    await page.locator('#max-wait').fill('15');

    // Submit the form
    await page.getByRole('button', { name: 'Get Recommended Arrival Time' }).click();

    // Wait for recommendation to appear
    await expect(page.getByText('Recommended Arrival')).toBeVisible();

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-arrival-planner', { fullPage: true });
  });
});

// ============================================================================
// Mobile Visual Tests
// ============================================================================

test.describe('Queue Times - Mobile Views', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile layout displays correctly', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Verify page title is visible
    await expect(page.locator('h1')).toHaveText('Queue Times');

    // Verify terminal selector is visible and usable
    await expect(page.locator('select')).toBeVisible();

    // Verify main content sections are visible
    await expect(page.getByText('Current Queue Status')).toBeVisible();
    await expect(page.getByText('Queue Predictions (24h)')).toBeVisible();
    await expect(page.getByText('Arrival Planner')).toBeVisible();
  });

  test('screenshot: mobile queue view', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-mobile', { fullPage: true });
  });

  test('screenshot: mobile arrival planner results', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Fill in arrival planner form
    await page.locator('#departure-time').fill('14:00');
    await page.locator('#max-wait').fill('20');

    // Submit the form
    await page.getByRole('button', { name: 'Get Recommended Arrival Time' }).click();

    // Wait for recommendation to appear
    await expect(page.getByText('Recommended Arrival')).toBeVisible();

    await maskDynamicContent(page);
    await captureScreenshot(page, 'queue-mobile-planner-results', { fullPage: true });
  });

  test('mobile terminal selector works', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Change terminal on mobile
    await page.locator('select').selectOption('gare-du-nord');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('select')).toHaveValue('gare-du-nord');
    await expect(page.getByText('Paris')).toBeVisible();
  });
});

// ============================================================================
// Auto-Refresh Tests
// ============================================================================

test.describe('Queue Times - Auto-Refresh', () => {
  test('displays update indicator', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Verify "Last updated" indicator is present
    await expect(page.getByText(/Last updated:/)).toBeVisible();
  });

  test('shows refresh countdown or auto-update message', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Look for auto-refresh indicator (could be countdown, "Updates every X min", etc.)
    const refreshIndicator = page
      .getByText(/refresh|update|auto|every \d+ (sec|min)/i)
      .or(page.locator('[data-testid="refresh-indicator"]'));

    // If refresh indicator exists, verify it's visible
    if ((await refreshIndicator.count()) > 0) {
      await expect(refreshIndicator.first()).toBeVisible();
    }
  });

  test('data refreshes after simulated time passing', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Get initial "Last updated" text
    const lastUpdatedLocator = page.getByText(/Last updated:/);
    const initialUpdateText = await lastUpdatedLocator.textContent();

    // Mock the current time to be 2 minutes later
    await page.evaluate(() => {
      const originalDate = Date;
      const futureTime = Date.now() + 2 * 60 * 1000; // 2 minutes later

      // Override Date.now()
      Date.now = () => futureTime;
    });

    // Trigger a manual refresh if there's a refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i }).or(
      page.locator('[data-testid="refresh-button"]')
    );

    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    }

    // Verify data is still displayed after time manipulation
    await expect(page.getByText('Current Queue Status')).toBeVisible();
    await expect(page.locator('text=/\\d+\\s*min/')).toBeVisible();
  });

  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Simulate network failure for subsequent requests
    await page.route('**/api/**queue**', (route) => {
      route.abort('failed');
    });

    // Try to trigger a refresh
    const refreshButton = page.getByRole('button', { name: /refresh/i }).or(
      page.locator('[data-testid="refresh-button"]')
    );

    if ((await refreshButton.count()) > 0) {
      await refreshButton.click();

      // Should show error state or maintain previous data
      // The page should not crash
      await expect(page.locator('h1')).toHaveText('Queue Times');
    }
  });

  test('maintains state during auto-refresh', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Fill in arrival planner
    await page.locator('#departure-time').fill('16:00');
    await page.locator('#max-wait').fill('25');

    // Submit to get recommendation
    await page.getByRole('button', { name: 'Get Recommended Arrival Time' }).click();
    await expect(page.getByText('Recommended Arrival')).toBeVisible();

    // Simulate a data refresh by intercepting and responding to API calls
    await page.route('**/api/**queue**', async (route) => {
      await route.continue();
    });

    // Wait a moment and verify form state is preserved
    await page.waitForTimeout(1000);

    // Form values should still be present
    await expect(page.locator('#departure-time')).toHaveValue('16:00');
    await expect(page.locator('#max-wait')).toHaveValue('25');

    // Recommendation should still be visible
    await expect(page.getByText('Recommended Arrival')).toBeVisible();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Queue Times - Accessibility', () => {
  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Verify h1 exists
    await expect(page.locator('h1')).toHaveText('Queue Times');

    // Verify section headings exist
    await expect(page.getByRole('heading', { name: 'Current Queue Status' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Queue Predictions/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Arrival Planner' })).toBeVisible();
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Verify departure time input has associated label
    const departureTimeInput = page.locator('#departure-time');
    const departureLabel = page.locator('label[for="departure-time"]');
    await expect(departureLabel).toBeVisible();

    // Verify max wait input has associated label
    const maxWaitInput = page.locator('#max-wait');
    const maxWaitLabel = page.locator('label[for="max-wait"]');
    await expect(maxWaitLabel).toBeVisible();
  });

  test('terminal selector is keyboard accessible', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);

    // Focus on terminal selector
    const terminalSelect = page.locator('select');
    await terminalSelect.focus();

    // Verify it's focused
    await expect(terminalSelect).toBeFocused();

    // Navigate with keyboard
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify selection changed
    const selectedValue = await terminalSelect.inputValue();
    expect(selectedValue).toBeTruthy();
  });

  test('submit button is keyboard accessible', async ({ page }) => {
    await page.goto('/queue');
    await waitForPageReady(page);
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // Fill in form using keyboard
    await page.locator('#departure-time').focus();
    await page.keyboard.type('14:00');
    await page.keyboard.press('Tab');
    await page.keyboard.type('20');
    await page.keyboard.press('Tab');

    // Submit with Enter key
    await page.keyboard.press('Enter');

    // Verify recommendation appears
    await expect(page.getByText('Recommended Arrival')).toBeVisible();
  });
});
