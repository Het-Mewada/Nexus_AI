import { test, expect } from '@playwright/test';

test.describe('Transaction Features', () => {
  // We use a unique string for each test run to ensure we don't conflict with existing data or other parallel tests
  const uniqueId = `Test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const expenseMerchant = `E2E Expense ${uniqueId}`;
  const incomeSource = `E2E Income ${uniqueId}`;

  test('should completely test the Income CRUD flow', async ({ page }) => {
    await page.goto('/income');
    await expect(page.getByRole('heading', { name: 'Income', exact: true })).toBeVisible();
    
    // 1. Create Income
    await page.getByRole('button', { name: /Add Income/i }).click();
    await expect(page.getByRole('heading', { name: /Add Income/i })).toBeVisible();
    
    await page.getByPlaceholder('0.00').fill('1500');
    await page.getByPlaceholder('e.g. Salary, Freelance').fill(incomeSource);
    await page.locator('input[name="date"]').fill(new Date().toISOString().split('T')[0]);
    
    await page.getByRole('button', { name: 'Add Income', exact: true }).click();
    
    // Ensure the dialog closes
    await expect(page.getByRole('heading', { name: /Add Income/i })).toBeHidden();
    
    // 2. Read / Verify Income appears in the list
    // Wait for the new item to render in the DOM
    await expect(page.getByText(incomeSource)).toBeVisible({ timeout: 10000 });
    
    // 3. Delete Income
    // Find the specific card
    const incomeCard = page.locator('.rounded-xl, .bg-card, .border, .shadow-sm').filter({ hasText: incomeSource }).first();
    // In our UI, the delete button has the Trash2 icon. We'll find it by looking for the button with the class containing 'text-destructive' or just the second ghost button.
    // Let's rely on aria-label or just filter by SVG
    await incomeCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
    
    // Wait for the Confirm Delete Dialog. In ConfirmDeleteDialog it says "Are you absolutely sure?" or "Delete Expense"
    await expect(page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' }))).toBeVisible();
    await page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' })).click();
    
    // 4. Verify Deletion
    await expect(page.getByText(incomeSource)).toBeHidden({ timeout: 10000 });
  });

  test('should completely test the Expenses CRUD flow', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
    
    // 1. Create Expense
    await page.getByRole('button', { name: /Add Expense/i }).click();
    await expect(page.getByRole('heading', { name: /Add Expense/i })).toBeVisible();
    
    await page.getByPlaceholder('0.00').fill('42.50');
    await page.getByPlaceholder('e.g. Amazon, Swiggy').fill(expenseMerchant);
    await page.locator('input[name="date"]').fill(new Date().toISOString().split('T')[0]);
    
    // Select Category
    await page.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();
    
    await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
    
    // Verify creation
    await expect(page.getByRole('heading', { name: /Add Expense/i })).toBeHidden();
    await expect(page.getByText(expenseMerchant)).toBeVisible({ timeout: 10000 });
    
    // 2. Update Expense
    const expenseCard = page.locator('.rounded-xl, .bg-card, .border, .shadow-sm').filter({ hasText: expenseMerchant }).first();
    
    // Click the Edit button
    await expenseCard.getByTitle('Edit').click();
    
    await expect(page.getByRole('heading', { name: /Edit Expense/i })).toBeVisible();
    await page.getByPlaceholder('0.00').fill('50.00');
    await page.getByRole('button', { name: 'Update Expense', exact: true }).click();
    
    // Verify update
    await expect(page.getByRole('heading', { name: /Edit Expense/i })).toBeHidden();
    // Check if the new amount is rendered in the card (The amount is formatted with a currency symbol and a minus sign, e.g. -₹50.00)
    await expect(expenseCard.getByText(/50\.00/).or(expenseCard.getByText('50'))).toBeVisible({ timeout: 10000 });
    
    // 3. Delete Expense
    await expenseCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
    await expect(page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' }))).toBeVisible();
    await page.getByRole('button', { name: /Delete/i, exact: true }).or(page.getByRole('button', { name: 'Continue' })).click();
    
    // Verify Deletion
    await expect(page.getByText(expenseMerchant)).toBeHidden({ timeout: 10000 });
  });

  test('form validation prevents negative amounts', async ({ page }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: /Add Expense/i }).click();
    
    // Fill out the form with a negative amount
    await page.getByPlaceholder('0.00').fill('-50');
    await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
    
    // Verify it doesn't close (error is shown)
    await expect(page.getByText(/Amount must be greater than 0/i)).toBeVisible();
  });

  test('form validation prevents 0 amount', async ({ page }) => {
    await page.goto('/income');
    await page.getByRole('button', { name: /Add Income/i }).click();
    
    await page.getByPlaceholder('0.00').fill('0');
    await page.getByRole('button', { name: 'Add Income', exact: true }).click();
    
    await expect(page.getByText(/Amount must be greater than 0/i)).toBeVisible();
  });

  test('form validation prevents missing required fields', async ({ page }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: /Add Expense/i }).click();
    
    // Click submit without filling anything
    await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
    
    await expect(page.getByText(/Amount must be greater than 0/i)).toBeVisible();
    await expect(page.getByText(/Merchant is required/i).or(page.getByText(/String must contain/i))).toBeVisible();
    await expect(page.getByText(/Date is required/i).or(page.getByText(/String must contain/i))).toBeVisible();
  });

  test('handles extremely large amounts gracefully', async ({ page }) => {
    await page.goto('/income');
    await page.getByRole('button', { name: /Add Income/i }).click();
    
    await page.getByPlaceholder('0.00').fill('999999999');
    await page.getByPlaceholder('e.g. Salary, Freelance').fill('Massive Income');
    await page.locator('input[name="date"]').fill(new Date().toISOString().split('T')[0]);
    await page.getByRole('button', { name: 'Add Income', exact: true }).click();
    
    // The UI should format it. We check if the modal closed.
    await expect(page.getByRole('heading', { name: /Add Income/i })).toBeHidden();
  });

  test('prevents XSS payloads in source/merchant fields', async ({ page }) => {
    await page.goto('/expenses');
    await page.getByRole('button', { name: /Add Expense/i }).click();
    
    await page.getByPlaceholder('0.00').fill('100');
    await page.getByPlaceholder('e.g. Amazon, Swiggy').fill('<script>alert(1)</script>XSS');
    await page.locator('input[name="date"]').fill(new Date().toISOString().split('T')[0]);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();
    
    await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Add Expense/i })).toBeHidden();
    
    // The XSS should be rendered as plain text, not executed as HTML
    await expect(page.getByText('<script>alert(1)</script>XSS')).toBeVisible();
  });
});
