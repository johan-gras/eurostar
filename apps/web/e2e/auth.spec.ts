import { test, expect } from '@playwright/test';

/**
 * Authentication E2E tests
 *
 * These tests serve as acceptance criteria for the frontend auth implementation.
 * Tests requiring backend auth are skipped unless the API server is running.
 */
test.describe('Authentication', () => {
  test('unauthenticated user sees login page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login page when not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login form should be visible
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    // Use the form's submit button specifically (type="submit")
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test.skip('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials|incorrect email or password/i)).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in valid credentials (test user)
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard content should be visible
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test.skip('logout button visible when authenticated', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout button should be visible
    const logoutButton = page.getByRole('button', { name: /log out|sign out/i });
    await expect(logoutButton).toBeVisible();
  });

  test.skip('logout clears session and redirects to login', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout
    await page.getByRole('button', { name: /log out|sign out/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);

    // Trying to access dashboard should redirect back to login
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });
});
