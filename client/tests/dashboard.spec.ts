import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load main dashboard widgets', async ({ page }) => {
    // Verify welcome heading
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    // Check for essential dashboard sections using actual titles
    await expect(page.getByText('Expense Breakdown').first()).toBeVisible();
    await expect(page.getByText('Recent Transactions').first()).toBeVisible();
    await expect(page.getByText('Upcoming Bills').first()).toBeVisible();
  });

  test('should display AI insights', async ({ page }) => {
    await expect(page.getByText(/AI Financial Insights/i)).toBeVisible();
  });
});
