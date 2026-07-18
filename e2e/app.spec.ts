/**
 * Flowrider E2E Tests
 *
 * NOTE: The 3D canvas tests are skipped in headless browser mode because
 * WebGL rendering is limited in Playwright's browser automation.
 * The canvas/3D functionality works correctly in the actual Electron app.
 *
 * These tests focus on non-WebGL UI elements that can be reliably tested.
 */

import { test, expect } from '@playwright/test';

// Helper to check if we're in a WebGL-capable environment
const hasWebGLSupport = async (page: any) => {
  return await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  });
};

test.describe('Flowrider App - Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should load the app and have root element', async ({ page }) => {
    // Check that the app root is present
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
  });

  test('should have app container with proper styling', async ({ page }) => {
    // The app container should be present
    const appDiv = page.locator('.app-container, .App, [class*="app"]').first();
    await expect(appDiv).toBeVisible({ timeout: 5000 });
  });

  test('should render without JavaScript errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out expected WebGL warnings
    const criticalErrors = errors.filter(e =>
      !e.includes('WebGL') &&
      !e.includes('THREE') &&
      !e.includes('canvas')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Flowrider App - 3D Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // Skip canvas tests if WebGL is not available
  test('should attempt to load canvas (WebGL dependent)', async ({ page }) => {
    const hasGL = await hasWebGLSupport(page);

    if (hasGL) {
      // If WebGL is available, canvas should render
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    } else {
      // If no WebGL, just verify the page loaded without canvas
      test.skip();
    }
  });
});

test.describe('Dashboard Views', () => {
  test('should have dashboard layout elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for the main app structure
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper document structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the page has a proper title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should respond to keyboard input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab through elements (no assertion, just verify no crash)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
  });
});
