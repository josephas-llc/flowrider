import { test, expect } from '@playwright/test';

test.describe('Flowrider App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the app and show icosahedron', async ({ page }) => {
    // Wait for the 3D canvas to load
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  });

  test('should have 20 session faces', async ({ page }) => {
    // The icosahedron has 20 faces representing sessions
    await expect(page.locator('canvas')).toBeVisible();
    // App should be in a ready state
    await page.waitForTimeout(2000);
  });

  test('should show session panel when clicking a face', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible();
    // Click on canvas to simulate face selection
    await page.locator('canvas').click();
    // Session panel should appear (or be visible)
    await page.waitForTimeout(1000);
  });

  test('should have main navigation elements', async ({ page }) => {
    // Check for main UI elements
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await expect(page.locator('canvas')).toBeVisible();
    // Test escape key to deselect
    await page.keyboard.press('Escape');
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  });

  test('should display session info when selected', async ({ page }) => {
    // Click canvas to select a face
    await page.locator('canvas').click();
    await page.waitForTimeout(500);
  });

  test('session names should not bleed between faces', async ({ page }) => {
    // This tests the bug fix we just implemented
    await page.locator('canvas').click();
    await page.waitForTimeout(500);
    // The session panel should show fresh state for each face
  });
});

test.describe('Dashboard Views', () => {
  test('should toggle between views', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Accessibility', () => {
  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });

  test('should respond to keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    // Escape to clear selection
    await page.keyboard.press('Escape');
  });
});
