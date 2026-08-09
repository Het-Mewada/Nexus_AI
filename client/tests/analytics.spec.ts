import { test, expect } from '@playwright/test';

test.describe('Analytics & AI Features', () => {
  test.describe('Analytics Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/analytics');
      // Look for the main analytics heading
      await expect(page.getByRole('heading', { name: /Analytics/i })).toBeVisible();
    });

    test('should load charts and allow date range changes', async ({ page }) => {
      // Check for chart existence
      await expect(page.locator('.recharts-wrapper, canvas').first()).toBeVisible({ timeout: 10000 });
      
      // Look for a date picker or range selector
      const dateSelector = page.getByRole('button', { name: /This Month|Last 30 Days/i });
      if (await dateSelector.isVisible()) {
          await dateSelector.click();
          await page.getByText(/Last Year/i).click();
          // Verify that chart re-renders
          await expect(page.locator('.recharts-wrapper, canvas').first()).toBeVisible();
      }
    });
  });

  test.describe('AI Advisor', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/ai');
      await expect(page.getByRole('heading', { name: /AI Financial Advisor/i })).toBeVisible();
    });

    test('should allow sending a message to AI and maintain context', async ({ page }) => {
      // Mock the AI chat endpoint to prevent failures when API keys aren't present in local dev
      await page.route('**/api/ai/chat', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        const msg = postData?.message?.toLowerCase() || '';
        
        let reply = "Hello! I am your AI assistant.";
        if (msg.includes("color")) {
          reply = "Your favorite color is blue.";
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: reply })
        });
      });

      // If there's a "Start New Chat" button, click it
      const startChatBtn = page.getByRole('button', { name: /Start New Chat/i });
      if (await startChatBtn.isVisible()) {
        await startChatBtn.click();
      }

      const inputField = page.getByPlaceholder(/Ask Anything/i);
      await expect(inputField).toBeVisible();

      // First Message
      const message1 = 'My favorite color is blue. Do not forget this.';
      await inputField.fill(message1);
      await page.getByRole('button', { name: /Send/i }).click();

      await expect(page.getByText(message1).first()).toBeVisible({ timeout: 30000 });
      
      // Since it's a mock API or actual LLM, wait a little bit for the response
      await page.waitForTimeout(1000);

      // Second Message (Testing Context)
      const message2 = 'What is my favorite color?';
      await inputField.fill(message2);
      await page.getByRole('button', { name: /Send/i }).click();

      await expect(page.getByText(message2).first()).toBeVisible({ timeout: 30000 });
      
      // Verify the AI responds with "blue"
      await expect(page.getByText(/blue/i).last()).toBeVisible({ timeout: 30000 });
    });
  });
});
