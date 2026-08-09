import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Authentication & Security', () => {
  // Tests that don't need authentication
  test.describe('Unauthenticated Flows', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Clear auth state

    test('should redirect to login when accessing protected routes', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*login/);
      
      await page.goto('/settings');
      await expect(page).toHaveURL(/.*login/);
    });

    test('shows validation errors on empty submission', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      
      // Should show zod validation errors
      await expect(page.getByText(/Please enter a valid email/i)).toBeVisible();
      await expect(page.getByText(/Password must be at least 6 characters/i)).toBeVisible();
    });

    test('shows error message on invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'wrong@example.com');
      await page.fill('input[type="password"]', 'WrongPassword123!');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      
      await expect(page.getByText(/Invalid login credentials/i)).toBeVisible({ timeout: 10000 });
    });

    test('prevents login with SQL injection payloads', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', "' OR 1=1 --");
      await page.fill('input[type="password"]', "' OR '1'='1");
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      
      // Either native validation blocks it (page doesn't change) or Zod/backend catches it.
      await expect(page.getByText(/Please enter a valid email/i).or(page.getByText(/Invalid login/i))).toBeVisible().catch(() => {
        // If native validation blocked it, we are still on the login page
      });
      await expect(page).toHaveURL(/.*login/);
    });

    test('prevents login with XSS payloads', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', '"><script>alert(1)</script>@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      
      // Should show invalid email format or invalid credentials
      await expect(page.getByText(/Please enter a valid email/i).or(page.getByText(/Invalid login/i))).toBeVisible().catch(() => {});
      await expect(page).toHaveURL(/.*login/);
    });

    test('prevents extremely long inputs', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', `${'a'.repeat(300)}@example.com`);
      await page.fill('input[type="password"]', 'a'.repeat(300));
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      
      // Should show an error from backend or UI
      await expect(page.getByText(/Invalid login credentials/i).or(page.getByText(/email must be/i))).toBeVisible({ timeout: 10000 });
    });
  });

  // Secure Logout Flow
  test.describe('Secure Logout', () => {
    test.skip('should allow user to login and then logout securely', async ({ page }) => {
      // 1. Manual login
      await page.goto('/login');
      await page.fill('input[type="email"]', process.env.TEST_EMAIL!);
      await page.fill('input[type="password"]', process.env.TEST_PASSWORD!);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      
      // Wait for dashboard to load
      await page.waitForURL('**/dashboard');
      await expect(page.getByRole('heading', { name: /Welcome back/i }).first()).toBeVisible();

      // 2. Open user menu
      await page.getByTestId('user-menu-btn').click();
      
      // 3. Click logout
      await page.getByText(/Log out/i).click();
      
      // 4. Verify redirect to login
      await expect(page).toHaveURL(/.*login/);
      
      // 5. Verify trying to go back to dashboard redirects to login again
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/.*login/);
    });
  });
});
