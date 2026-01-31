import { test, expect } from '@playwright/test';

/**
 * Feature Showcase — captures screenshots of all new features
 * for a visual "show and tell" review.
 * 
 * Run: npx playwright test e2e/feature-showcase.spec.ts --project=chromium
 */

const SCREENSHOT_DIR = 'showcase';

test.describe('Feature Showcase — New Features', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial render
    await expect(page.locator('h1')).toContainText('GitLab CI/CD Dashboard');
  });

  test('01 — Dashboard Overview (Light Mode)', async ({ page }) => {
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/01-dashboard-light.png`,
      fullPage: true 
    });
  });

  test('02 — Dashboard Overview (Dark Mode)', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');
    await themeBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/02-dashboard-dark.png`,
      fullPage: true 
    });
  });

  test('03 — Settings Panel with Config Selector (F03)', async ({ page }) => {
    // Expand settings if collapsed
    const settingsPanel = page.locator('.settings-panel');
    if (await settingsPanel.evaluate(el => el.classList.contains('collapsed'))) {
      await page.locator('.settings-btn').click();
    }
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/03-settings-config-selector.png`,
      fullPage: true 
    });
  });

  test('04 — Dark Mode Settings Panel', async ({ page }) => {
    await page.locator('.theme-btn').click();
    const settingsPanel = page.locator('.settings-panel');
    if (await settingsPanel.evaluate(el => el.classList.contains('collapsed'))) {
      await page.locator('.settings-btn').click();
    }
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/04-settings-dark.png`,
      fullPage: true 
    });
  });

  test('05 — Keyboard Shortcuts Overlay (F09)', async ({ page }) => {
    // Press ? to open shortcuts overlay
    await page.keyboard.press('?');
    await page.waitForTimeout(300);
    
    const overlay = page.locator('.shortcuts-overlay');
    if (await overlay.isVisible()) {
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/05-keyboard-shortcuts.png`,
        fullPage: true 
      });
    } else {
      // Try clicking the ? button in header
      const shortcutBtn = page.locator('button:has(kbd)').first();
      if (await shortcutBtn.isVisible()) {
        await shortcutBtn.click();
        await page.waitForTimeout(300);
      }
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/05-keyboard-shortcuts.png`,
        fullPage: true 
      });
    }
  });

  test('06 — Keyboard Shortcuts Dark Mode', async ({ page }) => {
    await page.locator('.theme-btn').click();
    await page.keyboard.press('?');
    await page.waitForTimeout(300);
    
    const overlay = page.locator('.shortcuts-overlay');
    if (!await overlay.isVisible()) {
      const shortcutBtn = page.locator('button:has(kbd)').first();
      if (await shortcutBtn.isVisible()) {
        await shortcutBtn.click();
        await page.waitForTimeout(300);
      }
    }
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/06-keyboard-shortcuts-dark.png`,
      fullPage: true 
    });
  });

  test('07 — View Toggle Buttons showing all views', async ({ page }) => {
    // Focus on the header area where view toggles are
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/07-header-view-toggles.png`,
      clip: { x: 0, y: 0, width: 1280, height: 200 }
    });
  });

  test('08 — Export Button (F10)', async ({ page }) => {
    // Look for the export button in header
    const exportBtn = page.locator('.export-button, button:has-text("Export")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/08-export-dropdown.png`,
      clip: { x: 0, y: 0, width: 1280, height: 400 }
    });
  });

  test('09 — Notification Bell (F04)', async ({ page }) => {
    const bell = page.locator('.notification-bell, [class*="notification"]').first();
    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/09-notification-bell.png`,
      clip: { x: 0, y: 0, width: 1280, height: 500 }
    });
  });

  test('10 — Auto-Refresh Status Bar (F05)', async ({ page }) => {
    // The refresh status bar should be visible in the header
    const refreshBar = page.locator('.refresh-status-bar, [class*="refresh"]').first();
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/10-auto-refresh-bar.png`,
      clip: { x: 0, y: 0, width: 1280, height: 300 }
    });
  });

  test('11 — Full Page Light Mode (all UI elements)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/11-full-page-1920-light.png`,
      fullPage: true 
    });
  });

  test('12 — Full Page Dark Mode (all UI elements)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.locator('.theme-btn').click();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/12-full-page-1920-dark.png`,
      fullPage: true 
    });
  });

  test('13 — Mobile Viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/13-mobile-view.png`,
      fullPage: true 
    });
  });

  test('14 — Mobile Dark Mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.theme-btn').click();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/14-mobile-dark.png`,
      fullPage: true 
    });
  });

  test('15 — Error Boundary Test (simulated)', async ({ page }) => {
    // Just capture that the app renders without errors
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/15-healthy-app-load.png`
    });
    // Verify no error boundary triggered
    const errorBoundary = page.locator('.error-boundary');
    expect(await errorBoundary.count()).toBe(0);
  });
});
