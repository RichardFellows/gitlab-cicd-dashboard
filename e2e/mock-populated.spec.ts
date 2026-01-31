import { test, expect, Page } from '@playwright/test';
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E tests with mock GitLab API — showcases the fully populated dashboard.
 * 
 * Run: npm run test:e2e:mock
 * 
 * Starts the mock API server automatically, intercepts /proxy/* requests
 * via page.route(), and captures screenshots of every view.
 */

const MOCK_PORT = 4100;
const MOCK_URL = `http://localhost:${MOCK_PORT}`;
const MOCK_GROUP_ID = '99001';
const SCREENSHOT_DIR = 'showcase/mock';

// Force serial execution — all tests share one mock server
test.describe.configure({ mode: 'serial' });

let mockServer: ChildProcess | null = null;

test.beforeAll(async () => {
  mockServer = spawn('node', [path.resolve(__dirname, '../scripts/mock-gitlab-api.mjs')], {
    env: { ...process.env, MOCK_PORT: String(MOCK_PORT) },
    stdio: 'pipe',
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Mock server failed to start within 10s')), 10000);
    mockServer!.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Mock GitLab API running')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    mockServer!.stderr?.on('data', (data: Buffer) => {
      console.error('[mock-api stderr]', data.toString());
    });
    mockServer!.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
});

test.afterAll(async () => {
  if (mockServer && !mockServer.killed) {
    mockServer.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => mockServer!.on('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
  }
});

/**
 * Intercept /proxy/* requests and forward to mock server
 */
async function setupMockRouting(page: Page) {
  await page.route('**/proxy/**', async (route) => {
    const url = new URL(route.request().url());
    const apiPath = url.pathname.replace(/^\/proxy/, '/api/v4');
    const mockUrl = `${MOCK_URL}${apiPath}${url.search}`;

    try {
      const response = await fetch(mockUrl, {
        method: route.request().method(),
        headers: { 'Accept': 'application/json' },
      });
      const contentType = response.headers.get('content-type') || 'application/json';
      const body = await response.text();

      await route.fulfill({
        status: response.status,
        contentType,
        body,
      });
    } catch (err) {
      console.error(`Mock routing error for ${mockUrl}:`, err);
      await route.abort('connectionrefused');
    }
  });
}

/**
 * Configure and load the dashboard with mock data
 */
async function loadDashboard(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('GitLab CI/CD Dashboard');

  const urlInput = page.locator('input[placeholder*="gitlab.com"]');
  await urlInput.clear();
  await urlInput.fill('https://gitlab.com/api/v4');

  const tokenInput = page.locator('input[type="password"]');
  await tokenInput.fill('glpat-mock-token-12345678');

  const groupInput = page.locator('input[placeholder*="Group ID" i]');
  await groupInput.fill(MOCK_GROUP_ID);
  await page.locator('button:has-text("Add")').first().click();

  const loadBtn = page.locator('button:has-text("Load Dashboard")');
  await loadBtn.click();

  // Wait for loading to complete
  await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 60000 });
  // Let charts render
  await page.waitForTimeout(2000);
}

async function toggleDarkMode(page: Page) {
  await page.locator('.theme-btn').click();
  await page.waitForTimeout(400);
}

// ════════════════════════════════════════════════════════════════════

test.describe('Mock Populated Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await setupMockRouting(page);
    await loadDashboard(page);
  });

  test('01 — Table View (Light)', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-table-light.png`, fullPage: true });
  });

  test('02 — Table View (Dark)', async ({ page }) => {
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-table-dark.png`, fullPage: true });
  });

  test('03 — Card View (Light)', async ({ page }) => {
    await page.locator('button:has-text("Cards")').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-cards-light.png`, fullPage: true });
  });

  test('04 — Card View (Dark)', async ({ page }) => {
    await page.locator('button:has-text("Cards")').click();
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-cards-dark.png`, fullPage: true });
  });

  test('05 — Environment Matrix (Light)', async ({ page }) => {
    await page.locator('button:has-text("Envs")').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-envs-light.png`, fullPage: true });
  });

  test('06 — Environment Matrix (Dark)', async ({ page }) => {
    await page.locator('button:has-text("Envs")').click();
    await page.waitForTimeout(1500);
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-envs-dark.png`, fullPage: true });
  });

  test('07 — Readiness View (Light)', async ({ page }) => {
    const readinessBtn = page.locator('button:has-text("Ready")');
    if (await readinessBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await readinessBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-readiness-light.png`, fullPage: true });
  });

  test('08 — Readiness View (Dark)', async ({ page }) => {
    const readinessBtn = page.locator('button:has-text("Ready")');
    if (await readinessBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await readinessBtn.click();
      await page.waitForTimeout(1500);
    }
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-readiness-dark.png`, fullPage: true });
  });

  test('09 — MR Board (Light)', async ({ page }) => {
    const mrBtn = page.locator('button:has-text("MRs")');
    if (await mrBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mrBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-mr-board-light.png`, fullPage: true });
  });

  test('10 — MR Board (Dark)', async ({ page }) => {
    const mrBtn = page.locator('button:has-text("MRs")');
    if (await mrBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mrBtn.click();
      await page.waitForTimeout(1500);
    }
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-mr-board-dark.png`, fullPage: true });
  });

  test('11 — Project Details (Light)', async ({ page }) => {
    const projectLink = page.locator('.project-name-link').first();
    if (await projectLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-project-details-light.png`, fullPage: true });
  });

  test('12 — Project Details (Dark)', async ({ page }) => {
    const projectLink = page.locator('.project-name-link').first();
    if (await projectLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForTimeout(2000);
    }
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-project-details-dark.png`, fullPage: true });
  });

  test('13 — Keyboard Shortcuts Overlay', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(400);
    const overlay = page.locator('.shortcuts-overlay');
    if (!await overlay.isVisible().catch(() => false)) {
      const shortcutBtn = page.locator('button:has(kbd)').first();
      if (await shortcutBtn.isVisible().catch(() => false)) await shortcutBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-keyboard-shortcuts.png`, fullPage: true });
  });

  test('14 — Export Dropdown', async ({ page }) => {
    const exportBtn = page.locator('.export-button, button:has-text("Export")').first();
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-export-dropdown.png`, clip: { x: 0, y: 0, width: 1280, height: 500 } });
  });

  test('15 — Summary Section Close-up', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-summary-section.png`, clip: { x: 0, y: 0, width: 1280, height: 400 } });
  });

  test('16 — Trend Charts', async ({ page }) => {
    const metricsPanel = page.locator('.metrics-panel');
    if (await metricsPanel.isVisible().catch(() => false)) {
      await metricsPanel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-trend-charts.png`, fullPage: true });
  });

  test('17 — Wide Viewport (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-wide-1920-light.png`, fullPage: true });
  });

  test('18 — Wide Viewport Dark', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/18-wide-1920-dark.png`, fullPage: true });
  });

  test('19 — Mobile Viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/19-mobile-light.png`, fullPage: true });
  });

  test('20 — Mobile Dark', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await toggleDarkMode(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-mobile-dark.png`, fullPage: true });
  });

  test('21 — Status Filter (Failed only)', async ({ page }) => {
    const failedFilter = page.locator('.filter-chip.failed, .filter-chip:has-text("Failed")').first();
    if (await failedFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await failedFilter.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-filter-failed.png`, fullPage: true });
  });

  test('22 — Health Score Sort', async ({ page }) => {
    const healthHeader = page.locator('th:has-text("Health"), .sort-btn:has-text("Health")').first();
    if (await healthHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await healthHeader.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-health-sorted.png`, fullPage: true });
  });
});
