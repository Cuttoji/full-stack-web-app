import { test, expect } from '@playwright/test';

/**
 * E2E tests for critical user flows
 * These tests verify the application loads and basic navigation works
 * Run with: npx playwright test
 */

test.describe('Page Load Tests', () => {
  test('login page loads successfully', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    
    // Wait for client-side hydration
    await page.waitForLoadState('networkidle');
    
    // Page should contain some content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('dashboard page loads successfully', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('tasks page loads successfully', async ({ page }) => {
    const response = await page.goto('/tasks');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('calendar page loads successfully', async ({ page }) => {
    const response = await page.goto('/calendar');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('settings page loads successfully', async ({ page }) => {
    const response = await page.goto('/settings');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should display on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
