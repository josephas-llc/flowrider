# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Flowrider App - 3D Canvas >> should attempt to load canvas (WebGL dependent)
- Location: e2e/app.spec.ts:71:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('canvas')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('canvas')

```

```yaml
- text: ◇ flowrider
- button "Skip Tour"
- text: ◇
- heading "Welcome to Flowrider" [level=1]
- paragraph: Run 20 AI sessions in parallel
- text: ⬡
- heading "Parallel AI Sessions" [level=3]
- paragraph: Work on 20 different tasks simultaneously
- text: △
- heading "Multiple AI Providers" [level=3]
- paragraph: Choose from Claude, GPT-4, Gemini, or local models
- text: ◈
- heading "Cost Tracking" [level=3]
- paragraph: Monitor your AI usage and optimize spending
- button "Back" [disabled]
- text: Step 1 of 5
- button "Next"
- navigation:
  - text: ◇ flowrider
  - button "1"
  - button "2"
  - button "3"
  - button "4"
  - button "5"
  - button "6"
  - button "7"
  - button "8"
  - button "9"
  - button "10"
  - button "11"
  - button "12"
  - button "13"
  - button "14"
  - button "15"
  - button "16"
  - button "17"
  - button "18"
  - button "19"
  - button "20"
  - button "+ New Session"
  - button "🧠 ZOIX 0"
  - button "Terminal"
  - button "Projects"
  - button "Dashboard"
  - button "Settings"
  - text: 0/20 $<0.01
  - button "🎬 Demo"
  - button "?"
  - button "⬡"
  - button "☰"
- text: 1 Empty 2 Empty 3 Empty 4 Empty 5 Empty 6 Empty 7 Empty 8 Empty 9 Empty 10 Empty 11 Empty 12 Empty 13 Empty 14 Empty 15 Empty 16 Empty 17 Empty 18 Empty 19 Empty 20 Empty
- button "▶ Start Demo Mode"
- text: Sessions
- button "−"
- 'button "Session 1: Session 1"'
- 'button "Session 2: Session 2"'
- 'button "Session 3: Session 3"'
- 'button "Session 4: Session 4"'
- 'button "Session 5: Session 5"'
- 'button "Session 6: Session 6"'
- 'button "Session 7: Session 7"'
- 'button "Session 8: Session 8"'
- 'button "Session 9: Session 9"'
- 'button "Session 10: Session 10"'
- 'button "Session 11: Session 11"'
- 'button "Session 12: Session 12"'
- 'button "Session 13: Session 13"'
- 'button "Session 14: Session 14"'
- 'button "Session 15: Session 15"'
- 'button "Session 16: Session 16"'
- 'button "Session 17: Session 17"'
- 'button "Session 18: Session 18"'
- 'button "Session 19: Session 19"'
- 'button "Session 20: Session 20"'
- text: Active Attention
```

# Test source

```ts
  1   | /**
  2   |  * Flowrider E2E Tests
  3   |  *
  4   |  * NOTE: The 3D canvas tests are skipped in headless browser mode because
  5   |  * WebGL rendering is limited in Playwright's browser automation.
  6   |  * The canvas/3D functionality works correctly in the actual Electron app.
  7   |  *
  8   |  * These tests focus on non-WebGL UI elements that can be reliably tested.
  9   |  */
  10  | 
  11  | import { test, expect } from '@playwright/test';
  12  | 
  13  | // Helper to check if we're in a WebGL-capable environment
  14  | const hasWebGLSupport = async (page: any) => {
  15  |   return await page.evaluate(() => {
  16  |     const canvas = document.createElement('canvas');
  17  |     const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  18  |     return !!gl;
  19  |   });
  20  | };
  21  | 
  22  | test.describe('Flowrider App - Basic UI', () => {
  23  |   test.beforeEach(async ({ page }) => {
  24  |     await page.goto('/');
  25  |     // Wait for the app to fully load
  26  |     await page.waitForLoadState('networkidle');
  27  |   });
  28  | 
  29  |   test('should load the app and have root element', async ({ page }) => {
  30  |     // Check that the app root is present
  31  |     await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
  32  |   });
  33  | 
  34  |   test('should have app container with proper styling', async ({ page }) => {
  35  |     // The app container should be present
  36  |     const appDiv = page.locator('.app-container, .App, [class*="app"]').first();
  37  |     await expect(appDiv).toBeVisible({ timeout: 5000 });
  38  |   });
  39  | 
  40  |   test('should render without JavaScript errors', async ({ page }) => {
  41  |     // Listen for console errors
  42  |     const errors: string[] = [];
  43  |     page.on('console', msg => {
  44  |       if (msg.type() === 'error') {
  45  |         errors.push(msg.text());
  46  |       }
  47  |     });
  48  | 
  49  |     await page.goto('/');
  50  |     await page.waitForLoadState('networkidle');
  51  |     await page.waitForTimeout(2000);
  52  | 
  53  |     // Filter out expected WebGL warnings
  54  |     const criticalErrors = errors.filter(e =>
  55  |       !e.includes('WebGL') &&
  56  |       !e.includes('THREE') &&
  57  |       !e.includes('canvas')
  58  |     );
  59  | 
  60  |     expect(criticalErrors.length).toBe(0);
  61  |   });
  62  | });
  63  | 
  64  | test.describe('Flowrider App - 3D Canvas', () => {
  65  |   test.beforeEach(async ({ page }) => {
  66  |     await page.goto('/');
  67  |     await page.waitForLoadState('networkidle');
  68  |   });
  69  | 
  70  |   // Skip canvas tests if WebGL is not available
  71  |   test('should attempt to load canvas (WebGL dependent)', async ({ page }) => {
  72  |     const hasGL = await hasWebGLSupport(page);
  73  | 
  74  |     if (hasGL) {
  75  |       // If WebGL is available, canvas should render
> 76  |       await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
      |                                            ^ Error: expect(locator).toBeVisible() failed
  77  |     } else {
  78  |       // If no WebGL, just verify the page loaded without canvas
  79  |       test.skip();
  80  |     }
  81  |   });
  82  | });
  83  | 
  84  | test.describe('Dashboard Views', () => {
  85  |   test('should have dashboard layout elements', async ({ page }) => {
  86  |     await page.goto('/');
  87  |     await page.waitForLoadState('networkidle');
  88  | 
  89  |     // Check for the main app structure
  90  |     const root = page.locator('#root');
  91  |     await expect(root).toBeVisible();
  92  |   });
  93  | });
  94  | 
  95  | test.describe('Accessibility', () => {
  96  |   test('should have proper document structure', async ({ page }) => {
  97  |     await page.goto('/');
  98  |     await page.waitForLoadState('networkidle');
  99  | 
  100 |     // Check that the page has a proper title
  101 |     const title = await page.title();
  102 |     expect(title.length).toBeGreaterThan(0);
  103 |   });
  104 | 
  105 |   test('should respond to keyboard input', async ({ page }) => {
  106 |     await page.goto('/');
  107 |     await page.waitForLoadState('networkidle');
  108 | 
  109 |     // Tab through elements (no assertion, just verify no crash)
  110 |     await page.keyboard.press('Tab');
  111 |     await page.keyboard.press('Tab');
  112 |     await page.keyboard.press('Escape');
  113 |   });
  114 | });
  115 | 
```