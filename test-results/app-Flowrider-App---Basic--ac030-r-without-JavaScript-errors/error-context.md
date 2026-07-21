# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Flowrider App - Basic UI >> should render without JavaScript errors
- Location: e2e/app.spec.ts:40:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 2
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: ◇
        - generic [ref=e8]: flowrider
      - button "Skip Tour" [ref=e9] [cursor=pointer]
    - generic [ref=e17]:
      - generic [ref=e18]: ◇
      - heading "Welcome to Flowrider" [level=1] [ref=e19]
      - paragraph [ref=e20]: Run 20 AI sessions in parallel
      - generic [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e23]: ⬡
          - generic [ref=e24]:
            - heading "Parallel AI Sessions" [level=3] [ref=e25]
            - paragraph [ref=e26]: Work on 20 different tasks simultaneously
        - generic [ref=e27]:
          - generic [ref=e28]: △
          - generic [ref=e29]:
            - heading "Multiple AI Providers" [level=3] [ref=e30]
            - paragraph [ref=e31]: Choose from Claude, GPT-4, Gemini, or local models
        - generic [ref=e32]:
          - generic [ref=e33]: ◈
          - generic [ref=e34]:
            - heading "Cost Tracking" [level=3] [ref=e35]
            - paragraph [ref=e36]: Monitor your AI usage and optimize spending
    - generic [ref=e37]:
      - button "Back" [disabled] [ref=e38]
      - generic [ref=e39]: Step 1 of 5
      - button "Next" [ref=e40] [cursor=pointer]
  - generic [ref=e41]:
    - navigation [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]: ◇
          - generic [ref=e46]: flowrider
        - generic [ref=e47]:
          - button "1" [ref=e48] [cursor=pointer]:
            - generic [ref=e49]: "1"
          - button "2" [ref=e50] [cursor=pointer]:
            - generic [ref=e51]: "2"
          - button "3" [ref=e52] [cursor=pointer]:
            - generic [ref=e53]: "3"
          - button "4" [ref=e54] [cursor=pointer]:
            - generic [ref=e55]: "4"
          - button "5" [ref=e56] [cursor=pointer]:
            - generic [ref=e57]: "5"
          - button "6" [ref=e58] [cursor=pointer]:
            - generic [ref=e59]: "6"
          - button "7" [ref=e60] [cursor=pointer]:
            - generic [ref=e61]: "7"
          - button "8" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]: "8"
          - button "9" [ref=e64] [cursor=pointer]:
            - generic [ref=e65]: "9"
          - button "10" [ref=e66] [cursor=pointer]:
            - generic [ref=e67]: "10"
          - button "11" [ref=e68] [cursor=pointer]:
            - generic [ref=e69]: "11"
          - button "12" [ref=e70] [cursor=pointer]:
            - generic [ref=e71]: "12"
          - button "13" [ref=e72] [cursor=pointer]:
            - generic [ref=e73]: "13"
          - button "14" [ref=e74] [cursor=pointer]:
            - generic [ref=e75]: "14"
          - button "15" [ref=e76] [cursor=pointer]:
            - generic [ref=e77]: "15"
          - button "16" [ref=e78] [cursor=pointer]:
            - generic [ref=e79]: "16"
          - button "17" [ref=e80] [cursor=pointer]:
            - generic [ref=e81]: "17"
          - button "18" [ref=e82] [cursor=pointer]:
            - generic [ref=e83]: "18"
          - button "19" [ref=e84] [cursor=pointer]:
            - generic [ref=e85]: "19"
          - button "20" [ref=e86] [cursor=pointer]:
            - generic [ref=e87]: "20"
        - button "+ New Session" [ref=e88] [cursor=pointer]:
          - generic [ref=e89]: +
          - text: New Session
        - button "🧠 ZOIX 0" [ref=e90] [cursor=pointer]:
          - generic [ref=e91]: 🧠
          - generic [ref=e92]: ZOIX
          - generic [ref=e93]: "0"
      - generic [ref=e94]:
        - generic [ref=e95]:
          - button "Terminal" [ref=e96] [cursor=pointer]
          - button "Projects" [ref=e97] [cursor=pointer]
          - button "Dashboard" [ref=e98] [cursor=pointer]
          - button "Settings" [ref=e99] [cursor=pointer]
        - generic [ref=e100]:
          - generic [ref=e101]: 0/20
          - generic [ref=e102]: $<0.01
        - button "🎬 Demo" [ref=e103] [cursor=pointer]
        - button "?" [ref=e104] [cursor=pointer]
        - button "⬡" [ref=e105] [cursor=pointer]:
          - generic [ref=e106]: ⬡
        - button "☰" [ref=e107] [cursor=pointer]:
          - generic [ref=e108]: ☰
    - generic [ref=e109]:
      - generic [ref=e110]:
        - generic [ref=e111] [cursor=pointer]:
          - generic [ref=e112]: "1"
          - generic [ref=e113]: Empty
        - generic [ref=e114] [cursor=pointer]:
          - generic [ref=e115]: "2"
          - generic [ref=e116]: Empty
        - generic [ref=e117] [cursor=pointer]:
          - generic [ref=e118]: "3"
          - generic [ref=e119]: Empty
        - generic [ref=e120] [cursor=pointer]:
          - generic [ref=e121]: "4"
          - generic [ref=e122]: Empty
        - generic [ref=e123] [cursor=pointer]:
          - generic [ref=e124]: "5"
          - generic [ref=e125]: Empty
        - generic [ref=e126] [cursor=pointer]:
          - generic [ref=e127]: "6"
          - generic [ref=e128]: Empty
        - generic [ref=e129] [cursor=pointer]:
          - generic [ref=e130]: "7"
          - generic [ref=e131]: Empty
        - generic [ref=e132] [cursor=pointer]:
          - generic [ref=e133]: "8"
          - generic [ref=e134]: Empty
        - generic [ref=e135] [cursor=pointer]:
          - generic [ref=e136]: "9"
          - generic [ref=e137]: Empty
        - generic [ref=e138] [cursor=pointer]:
          - generic [ref=e139]: "10"
          - generic [ref=e140]: Empty
        - generic [ref=e141] [cursor=pointer]:
          - generic [ref=e142]: "11"
          - generic [ref=e143]: Empty
        - generic [ref=e144] [cursor=pointer]:
          - generic [ref=e145]: "12"
          - generic [ref=e146]: Empty
        - generic [ref=e147] [cursor=pointer]:
          - generic [ref=e148]: "13"
          - generic [ref=e149]: Empty
        - generic [ref=e150] [cursor=pointer]:
          - generic [ref=e151]: "14"
          - generic [ref=e152]: Empty
        - generic [ref=e153] [cursor=pointer]:
          - generic [ref=e154]: "15"
          - generic [ref=e155]: Empty
        - generic [ref=e156] [cursor=pointer]:
          - generic [ref=e157]: "16"
          - generic [ref=e158]: Empty
        - generic [ref=e159] [cursor=pointer]:
          - generic [ref=e160]: "17"
          - generic [ref=e161]: Empty
        - generic [ref=e162] [cursor=pointer]:
          - generic [ref=e163]: "18"
          - generic [ref=e164]: Empty
        - generic [ref=e165] [cursor=pointer]:
          - generic [ref=e166]: "19"
          - generic [ref=e167]: Empty
        - generic [ref=e168] [cursor=pointer]:
          - generic [ref=e169]: "20"
          - generic [ref=e170]: Empty
      - button "▶ Start Demo Mode" [ref=e172] [cursor=pointer]:
        - generic [ref=e173]: ▶
        - text: Start Demo Mode
      - generic [ref=e174]:
        - generic [ref=e175]:
          - generic [ref=e176]: Sessions
          - button "−" [ref=e177] [cursor=pointer]
        - generic [ref=e178]:
          - generic [ref=e179]:
            - 'button "Session 1: Session 1" [ref=e180] [cursor=pointer]'
            - 'button "Session 2: Session 2" [ref=e181] [cursor=pointer]'
            - 'button "Session 3: Session 3" [ref=e182] [cursor=pointer]'
            - 'button "Session 4: Session 4" [ref=e183] [cursor=pointer]'
            - 'button "Session 5: Session 5" [ref=e184] [cursor=pointer]'
          - generic [ref=e185]:
            - 'button "Session 6: Session 6" [ref=e186] [cursor=pointer]'
            - 'button "Session 7: Session 7" [ref=e187] [cursor=pointer]'
            - 'button "Session 8: Session 8" [ref=e188] [cursor=pointer]'
            - 'button "Session 9: Session 9" [ref=e189] [cursor=pointer]'
            - 'button "Session 10: Session 10" [ref=e190] [cursor=pointer]'
          - generic [ref=e191]:
            - 'button "Session 11: Session 11" [ref=e192] [cursor=pointer]'
            - 'button "Session 12: Session 12" [ref=e193] [cursor=pointer]'
            - 'button "Session 13: Session 13" [ref=e194] [cursor=pointer]'
            - 'button "Session 14: Session 14" [ref=e195] [cursor=pointer]'
            - 'button "Session 15: Session 15" [ref=e196] [cursor=pointer]'
          - generic [ref=e197]:
            - 'button "Session 16: Session 16" [ref=e198] [cursor=pointer]'
            - 'button "Session 17: Session 17" [ref=e199] [cursor=pointer]'
            - 'button "Session 18: Session 18" [ref=e200] [cursor=pointer]'
            - 'button "Session 19: Session 19" [ref=e201] [cursor=pointer]'
            - 'button "Session 20: Session 20" [ref=e202] [cursor=pointer]'
        - generic [ref=e203]:
          - generic [ref=e204]: Active
          - generic [ref=e206]: Attention
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
> 60  |     expect(criticalErrors.length).toBe(0);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
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
  76  |       await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
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