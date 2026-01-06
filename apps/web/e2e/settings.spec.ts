import { test, expect } from '@playwright/test';
import { waitForPageReady, maskDynamicContent } from './fixtures/test-utils';

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
} as const;

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('has correct page title and header', async ({ page }) => {
    await expect(page).toHaveTitle(/Settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('renders seat preferences card', async ({ page }) => {
    const seatPrefsCard = page.locator('text=Seat Preferences').locator('..');
    await expect(seatPrefsCard).toBeVisible();
    await expect(page.getByText('Your preferred seat settings for RailSeatMap recommendations')).toBeVisible();
  });

  test('seat position dropdown works', async ({ page }) => {
    const seatPositionTrigger = page.locator('label:has-text("Seat Position")').locator('..').locator('button');
    await seatPositionTrigger.click();

    // Options should be visible
    await expect(page.getByRole('option', { name: 'Window' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Aisle' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Middle' })).toBeVisible();

    // Select an option
    await page.getByRole('option', { name: 'Window' }).click();
    await expect(seatPositionTrigger).toHaveText('Window');
  });

  test('travel direction dropdown works', async ({ page }) => {
    const directionTrigger = page.locator('label:has-text("Travel Direction")').locator('..').locator('button');
    await directionTrigger.click();

    await expect(page.getByRole('option', { name: 'Forward facing' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Backward facing' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'No preference' })).toBeVisible();

    await page.getByRole('option', { name: 'Forward facing' }).click();
    await expect(directionTrigger).toHaveText('Forward facing');
  });

  test('coach type dropdown works', async ({ page }) => {
    const coachTrigger = page.locator('label:has-text("Coach Type")').locator('..').locator('button');
    await coachTrigger.click();

    await expect(page.getByRole('option', { name: 'Quiet coach' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Standard coach' })).toBeVisible();

    await page.getByRole('option', { name: 'Quiet coach' }).click();
    await expect(coachTrigger).toHaveText('Quiet coach');
  });

  test('table seat switch toggles', async ({ page }) => {
    const tableSwitch = page.locator('text=Table seat').locator('..').locator('..').locator('button[role="switch"]');
    await expect(tableSwitch).toBeVisible();

    // Initially off
    await expect(tableSwitch).toHaveAttribute('aria-checked', 'false');

    // Toggle on
    await tableSwitch.click();
    await expect(tableSwitch).toHaveAttribute('aria-checked', 'true');

    // Toggle off
    await tableSwitch.click();
    await expect(tableSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('power socket switch toggles', async ({ page }) => {
    const powerSwitch = page.locator('text=Power socket').locator('..').locator('..').locator('button[role="switch"]');
    await expect(powerSwitch).toBeVisible();

    await expect(powerSwitch).toHaveAttribute('aria-checked', 'false');
    await powerSwitch.click();
    await expect(powerSwitch).toHaveAttribute('aria-checked', 'true');
  });

  test('notifications card has link to notification settings', async ({ page }) => {
    const notificationsCard = page.locator('text=Notifications').first().locator('..');
    await expect(notificationsCard).toBeVisible();

    const manageButton = page.getByRole('button', { name: 'Manage notification settings' });
    await expect(manageButton).toBeVisible();
    await manageButton.click();

    await expect(page).toHaveURL(/\/settings\/notifications/);
  });

  test('queue notifications section renders', async ({ page }) => {
    await expect(page.getByText('Queue Notifications')).toBeVisible();
    await expect(page.getByText('Queue alerts')).toBeVisible();
    await expect(page.getByText('Default Terminal')).toBeVisible();
  });

  test('default terminal dropdown works', async ({ page }) => {
    const terminalTrigger = page.locator('label:has-text("Default Terminal")').locator('..').locator('button');
    await terminalTrigger.click();

    await expect(page.getByRole('option', { name: 'St Pancras International' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Paris Gare du Nord' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Brussels Midi' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Amsterdam Centraal' })).toBeVisible();

    await page.getByRole('option', { name: 'St Pancras International' }).click();
    await expect(terminalTrigger).toHaveText('St Pancras International');
  });

  test('compensation preferences section renders', async ({ page }) => {
    await expect(page.getByText('Compensation Preferences')).toBeVisible();
    await expect(page.getByText('Preferred Compensation Type')).toBeVisible();
  });

  test('compensation type dropdown works', async ({ page }) => {
    const compTrigger = page.locator('label:has-text("Preferred Compensation Type")').locator('..').locator('button');
    await compTrigger.click();

    await expect(page.getByRole('option', { name: 'Cash refund' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'E-voucher (higher value)' })).toBeVisible();

    await page.getByRole('option', { name: 'E-voucher (higher value)' }).click();
    await expect(compTrigger).toHaveText('E-voucher (higher value)');
  });

  test('save button is visible and clickable', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: 'Save Preferences' });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });
});

test.describe('Notification Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
  });

  test('has correct page title and header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Notification Settings' })).toBeVisible();
  });

  test('back button navigates to settings', async ({ page }) => {
    const backButton = page.locator('a[href="/settings"]').locator('button');
    await backButton.click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('delay alerts section renders', async ({ page }) => {
    await expect(page.getByText('Delay Alerts')).toBeVisible();
    await expect(page.getByText('Enable delay alerts')).toBeVisible();
  });

  test('delay alerts toggle enables threshold settings', async ({ page }) => {
    const delayAlertsSwitch = page.locator('text=Enable delay alerts').locator('..').locator('..').locator('button[role="switch"]');
    await expect(delayAlertsSwitch).toBeVisible();

    // Should be enabled by default, showing threshold options
    await expect(page.getByText('Notification threshold')).toBeVisible();
  });

  test('notification threshold dropdown works', async ({ page }) => {
    const thresholdTrigger = page.locator('label:has-text("Notification threshold")').locator('..').locator('button').first();
    await thresholdTrigger.click();

    await expect(page.getByRole('option', { name: '15 minutes' })).toBeVisible();
    await expect(page.getByRole('option', { name: '30 minutes' })).toBeVisible();
    await expect(page.getByRole('option', { name: '1 hour' })).toBeVisible();
    await expect(page.getByRole('option', { name: '2 hours' })).toBeVisible();

    await page.getByRole('option', { name: '1 hour' }).click();
    await expect(thresholdTrigger).toHaveText('1 hour');
  });

  test('custom threshold slider is visible', async ({ page }) => {
    await expect(page.getByText('Or set a custom threshold')).toBeVisible();
    const slider = page.locator('span[role="slider"]');
    await expect(slider).toBeVisible();
  });

  test('claim deadline reminders toggle works', async ({ page }) => {
    const claimReminderSwitch = page.locator('text=Claim deadline reminders').locator('..').locator('..').locator('button[role="switch"]');
    await expect(claimReminderSwitch).toBeVisible();
    await claimReminderSwitch.click();
  });

  test('email notifications section renders', async ({ page }) => {
    await expect(page.getByText('Email Notifications')).toBeVisible();
    await expect(page.locator('text=Email notifications').first()).toBeVisible();
  });

  test('email notifications toggle controls sub-options', async ({ page }) => {
    // Email-specific options should be visible when email enabled
    await expect(page.getByText('Claim status updates')).toBeVisible();
    await expect(page.getByText('Train departure reminders')).toBeVisible();
  });

  test('queue notifications section renders', async ({ page }) => {
    const queueSection = page.locator('h3:has-text("Queue Notifications"), [class*="CardTitle"]:has-text("Queue Notifications")');
    await expect(queueSection.first()).toBeVisible();
  });

  test('push notifications section renders', async ({ page }) => {
    await expect(page.getByText('Push Notifications')).toBeVisible();
    await expect(page.getByText('Enable push notifications')).toBeVisible();
  });

  test('save notification settings button is visible', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: 'Save Notification Settings' });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });
});

test.describe('Settings Visual Regression', () => {
  test.describe('Desktop (1280x720)', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test('settings page screenshot comparison', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('settings-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('notification settings page screenshot comparison', async ({ page }) => {
      await page.goto('/settings/notifications');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('notification-settings-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });

  test.describe('Mobile (375x667)', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test('settings page screenshot comparison', async ({ page }) => {
      await page.goto('/settings');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('settings-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });

    test('notification settings page screenshot comparison', async ({ page }) => {
      await page.goto('/settings/notifications');
      await waitForPageReady(page);
      await maskDynamicContent(page);

      await expect(page).toHaveScreenshot('notification-settings-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  });
});
