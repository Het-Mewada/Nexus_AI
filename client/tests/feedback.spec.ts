import { test, expect } from '@playwright/test';

test.describe('Feedback & Bug Reporting System', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming there's a login mechanism or a mock session
    // For this e2e test, we will navigate to the login, sign in, and then go to /feedback
    await page.goto('/login');
    // We expect the app to handle standard auth, or we can just mock it.
    // If the app is already authenticated, this will redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');
  });

  test('should display the Feedback page with tabs', async ({ page }) => {
    await expect(page.locator('text=Feedback & Support')).toBeVisible();
    await expect(page.locator('text=Submit Feedback')).toBeVisible();
    await expect(page.locator('text=My Feedbacks')).toBeVisible();
  });

  test('should show validation errors on empty submit', async ({ page }) => {
    await page.click('button:has-text("Submit Feedback")');
    await expect(page.locator('text=Title must be at least 5 characters')).toBeVisible();
    await expect(page.locator('text=Please provide more details (min 10 characters)')).toBeVisible();
  });

  test('should submit feedback successfully', async ({ page }) => {
    // Fill out the form
    await page.fill('input[id="title"]', 'Test Bug Report');
    await page.fill('textarea[id="description"]', 'This is a test bug report description that is longer than 10 characters.');
    
    // Select type
    await page.click('button[role="combobox"]');
    await page.click('text=Bug Report');

    // Submit
    await page.click('button:has-text("Submit Feedback")');

    // Wait for success toast
    await expect(page.locator('text=Feedback submitted successfully!')).toBeVisible();

    // Verify it switched to 'My Feedbacks' tab and displays the new feedback
    await expect(page.locator('text=Test Bug Report').first()).toBeVisible();
    await expect(page.locator('text=This is a test bug report').first()).toBeVisible();
  });
});
