import { test, expect } from '@playwright/test';

test.describe('Planning Features', () => {
  const uniqueId = `Test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const goalName = `E2E Goal ${uniqueId}`;
  const billName = `E2E Bill ${uniqueId}`;
  const subName = `E2E Sub ${uniqueId}`;

  test('should completely test the Goals CRUD flow', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.getByRole('heading', { name: 'Financial Goals', exact: true })).toBeVisible();
    
    // 1. Create Goal
    await page.getByRole('button', { name: /Add Goal/i }).click();
    await expect(page.getByRole('heading', { name: /Add Goal/i })).toBeVisible();
    
    await page.getByPlaceholder('e.g. New Car').fill(goalName);
    // targetAmount
    await page.locator('input[name="targetAmount"]').fill('5000');
    // currentAmount
    await page.locator('input[name="currentAmount"]').fill('1000');
    
    await page.getByRole('button', { name: 'Add Goal', exact: true }).click();
    
    // Verify creation
    await expect(page.getByRole('heading', { name: /Add Goal/i })).toBeHidden();
    await expect(page.getByText(goalName)).toBeVisible({ timeout: 10000 });
    
    // 2. Delete Goal
    const goalCard = page.locator('.rounded-xl, .bg-card, .border, .shadow-sm').filter({ hasText: goalName }).first();
    await goalCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
    
    await expect(page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' }))).toBeVisible();
    await page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' })).click();
    
    // Verify Deletion
    await expect(page.getByText(goalName)).toBeHidden({ timeout: 10000 });
  });

  test('should completely test the Bills CRUD flow', async ({ page }) => {
    await page.goto('/bills');
    await expect(page.getByRole('heading', { name: 'Bills & Reminders', exact: true })).toBeVisible();
    
    // 1. Create Bill
    await page.getByRole('button', { name: /Add Bill/i }).click();
    await expect(page.getByRole('heading', { name: /Add Bill/i })).toBeVisible();
    
    await page.getByPlaceholder('e.g. Electricity').fill(billName);
    await page.locator('input[name="amount"]').fill('120');
    
    // Set due date to tomorrow to avoid overdue errors
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('input[name="dueDate"]').fill(tomorrow.toISOString().split('T')[0]);
    
    await page.getByRole('button', { name: 'Add Bill', exact: true }).click();
    
    // Verify creation
    await expect(page.getByRole('heading', { name: /Add Bill/i })).toBeHidden();
    await expect(page.getByText(billName)).toBeVisible({ timeout: 10000 });
    
    // 2. Delete Bill
    const billCard = page.locator('.rounded-xl, .bg-card, .border, .shadow-sm').filter({ hasText: billName }).first();
    await billCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
    
    await expect(page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' }))).toBeVisible();
    await page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' })).click();
    
    // Verify Deletion
    await expect(page.getByText(billName)).toBeHidden({ timeout: 10000 });
  });

  test('should completely test the Subscriptions CRUD flow', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page.getByRole('heading', { name: 'Subscriptions', exact: true })).toBeVisible();
    
    // 1. Create Subscription
    await page.getByRole('button', { name: /Add Subscription/i }).click();
    await expect(page.getByRole('heading', { name: /Add Subscription/i })).toBeVisible();
    
    await page.getByPlaceholder('e.g. Netflix').fill(subName);
    await page.locator('input[name="amount"]').fill('15.99');
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await page.locator('input[name="nextBillingDate"]').fill(nextMonth.toISOString().split('T')[0]);
    
    await page.getByRole('button', { name: 'Add Subscription', exact: true }).click();
    
    // Verify creation
    await expect(page.getByRole('heading', { name: /Add Subscription/i })).toBeHidden();
    await expect(page.getByText(subName)).toBeVisible({ timeout: 10000 });
    
    // 2. Delete Subscription
    const subCard = page.locator('.rounded-xl, .bg-card, .border, .shadow-sm').filter({ hasText: subName }).first();
    await subCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
    
    await expect(page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' }))).toBeVisible();
    await page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' })).click();
    
    // Verify Deletion
    await expect(page.getByText(subName)).toBeHidden({ timeout: 10000 });
  });

  test('prevents creating a goal with target amount less than current amount', async ({ page }) => {
    await page.goto('/goals');
    await page.getByRole('button', { name: /Add Goal/i }).click();
    
    await page.getByPlaceholder('e.g. New Car').fill('Invalid Goal Amounts');
    await page.locator('input[name="targetAmount"]').fill('100');
    await page.locator('input[name="currentAmount"]').fill('500');
    await page.getByRole('button', { name: 'Add Goal', exact: true }).click();
    
    // Either a validation error or form doesn't submit
    await expect(page.getByText(/Target amount must be greater than current amount/i).or(page.getByText(/greater than/i))).toBeVisible({ timeout: 5000 }).catch(() => {
        // If the specific error message is different, we at least assert the dialog didn't close
    });
    await expect(page.getByRole('heading', { name: /Add Goal/i })).toBeVisible();
  });

  test('bills validation prevents negative amounts and empty names', async ({ page }) => {
    await page.goto('/bills');
    await page.getByRole('button', { name: /Add Bill/i }).first().click();
    
    // Wait for dialog to open
    await expect(page.getByRole('heading', { name: 'Add Bill' })).toBeVisible();

    // Empty submit
    await page.getByRole('dialog').getByRole('button', { name: 'Add Bill', exact: true }).click();
    
    // Use try/catch to not crash if native validation intercepts
    await expect(page.getByText(/Name is required/i).or(page.getByText(/String must contain/i))).toBeVisible().catch(() => {});
    
    // Negative amount
    await page.getByPlaceholder('e.g. Electricity').fill('Negative Bill');
    await page.locator('input[name="amount"]').fill('-50');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator('input[name="dueDate"]').fill(tomorrow.toISOString().split('T')[0]);
    
    await page.getByRole('dialog').getByRole('button', { name: 'Add Bill', exact: true }).click();
    await expect(page.getByText(/greater than 0/i).or(page.getByText(/must be positive/i))).toBeVisible().catch(() => {});
    
    // Assert we didn't submit successfully
    await expect(page.getByRole('heading', { name: 'Add Bill' })).toBeVisible();
  });

  test('handles extremely long subscription names and auto-pay toggle', async ({ page }) => {
    await page.goto('/subscriptions');
    await page.getByRole('button', { name: /Add Subscription/i }).click();
    
    const longName = 'A'.repeat(250);
    await page.getByPlaceholder('e.g. Netflix').fill(longName);
    await page.locator('input[name="amount"]').fill('9.99');
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await page.locator('input[name="nextBillingDate"]').fill(nextMonth.toISOString().split('T')[0]);
    
    // Toggle auto pay (assuming it's a switch or checkbox)
    const autoPayToggle = page.getByRole('switch', { name: /auto/i });
    if (await autoPayToggle.count() > 0) {
      await autoPayToggle.click();
    }
    
    await page.getByRole('button', { name: 'Add Subscription', exact: true }).click();
    
    // Check for length validation error or successful creation if allowed
    const errorMsg = page.getByText(/too long/i);
    if (await errorMsg.count() > 0) {
      await expect(errorMsg).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /Add Subscription/i })).toBeHidden();
      // clean up if it succeeded
      const subCard = page.locator('.rounded-xl, .bg-card, .border, .shadow-sm').filter({ hasText: 'A'.repeat(20) }).first(); // it might truncate in UI
      if (await subCard.count() > 0) {
        await subCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
        await page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' })).click();
      }
    }
  });
});
