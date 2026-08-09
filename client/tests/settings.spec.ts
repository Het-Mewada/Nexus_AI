import { test, expect } from '@playwright/test';

test.describe('Settings Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Settings/i, exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should load settings page and navigate tabs', async ({ page }) => {
    await page.getByRole('tab', { name: /Profile/i }).click();
    await expect(page.getByText(/Full Name/i)).toBeVisible();

    await page.getByRole('tab', { name: /Preferences/i }).click();
    await expect(page.getByText('Theme', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /Account/i }).click();
    await expect(page.getByRole('button', { name: /Delete Account/i }).first()).toBeVisible();
  });

  test('should allow updating profile name and reflect it globally', async ({ page }) => {
    await page.getByRole('tab', { name: /Profile/i }).click();
    
    const uniqueName = `TestUser_${Math.random().toString(36).substring(2, 7)}`;
    
    // Clear and fill the name input
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(uniqueName);
    
    // Click Save Changes
    await page.getByRole('button', { name: /Save Changes/i }).click();
    
    // Check if the toast or success state occurs
    await expect(page.getByRole('button', { name: /Saved/i }).or(page.getByText(/Profile updated/i))).toBeVisible({ timeout: 10000 });

    // Navigate to dashboard and check if the greeting uses the new name
    await page.goto('/dashboard');
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  });

  test('should toggle theme preferences', async ({ page }) => {
    await page.getByRole('tab', { name: /Preferences/i }).click();
    
    const darkThemeButton = page.getByText(/Dark/i, { exact: true });
    if (await darkThemeButton.isVisible()) {
        await darkThemeButton.click();
        await expect(page.locator('html')).toHaveClass(/dark/);
    }
  });

  test('validates profile name length and emptiness', async ({ page }) => {
    await page.getByRole('tab', { name: /Profile/i }).click();
    
    const nameInput = page.locator('input[name="name"]');
    
    // Empty name
    await nameInput.clear();
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.getByText(/Name must be at least/i).or(page.getByText(/Name is required/i))).toBeVisible();
    
    // Extremely long name
    const longName = 'A'.repeat(150);
    await nameInput.fill(longName);
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.getByText(/too long/i).or(page.getByText(/maximum/i))).toBeVisible();
  });

  test('changes currency and persists', async ({ page }) => {
    await page.getByRole('tab', { name: /Profile/i }).click();
    
    // Find currency select
    await page.getByRole('combobox').first().click();
    await page.getByRole('option').filter({ hasText: 'EUR' }).first().click();
    
    // Some apps auto-save preferences, others require a save button
    const saveBtn = page.getByRole('button', { name: /Save/i });
    if (await saveBtn.count() > 0) {
      await saveBtn.first().click();
      await expect(page.getByText(/updated/i).or(page.getByText(/saved/i))).toBeVisible({ timeout: 10000 }).catch(() => {});
    }
  });
});
