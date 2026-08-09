import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // If the user hasn't set these, the test will fail gracefully
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in client/.env');
  }

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait until the dashboard loads
  await page.waitForURL('**/dashboard');

  // Give Supabase time to persist session to localStorage
  await page.waitForTimeout(2000);

  // Save the authentication state
  await page.context().storageState({ path: authFile });
});
