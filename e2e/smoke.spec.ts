import { test, expect } from '@playwright/test';

test.describe('Deployment Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page has a title
    await expect(page).toHaveTitle(/.+/);

    // Verify body is visible
    await expect(page.locator('body')).toBeVisible();

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('critical resources load', async ({ page }) => {
    const response = await page.goto('/');

    // Verify successful response
    expect(response?.status()).toBe(200);

    // Verify body content exists
    await expect(page.locator('body')).toContainText(/.+/);
  });
});
