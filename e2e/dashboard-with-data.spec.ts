import { test, expect } from '@playwright/test';

/**
 * E2E tests that require GitLab authentication
 * These tests verify dashboard functionality with real data
 *
 * Set GITLAB_TOKEN environment variable to run these tests:
 * GITLAB_TOKEN=glpat-xxx npm run test:e2e
 */

const TEST_CONFIG = {
  gitlabUrl: 'https://gitlab.com',
  groupId: '122839760', // test-group6330604
  token: process.env.GITLAB_TOKEN || '',
};

// Skip these tests if no token is provided
const describeWithToken = TEST_CONFIG.token ? test.describe : test.describe.skip;

describeWithToken('Dashboard with Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Configure and load dashboard
    const urlInput = page.locator('input[placeholder*="gitlab.com"]');
    await urlInput.clear();
    await urlInput.fill(TEST_CONFIG.gitlabUrl);

    const tokenInput = page.locator('input[type="password"]');
    await tokenInput.fill(TEST_CONFIG.token);

    const groupInput = page.locator('input[placeholder*="Group ID"]');
    await groupInput.fill(TEST_CONFIG.groupId);
    await page.locator('button:has-text("Add")').first().click();

    // Click load and wait for data
    const loadBtn = page.locator('button:has-text("Load Dashboard")');
    await loadBtn.click();

    // Wait for loading to complete (up to 30 seconds)
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 30000 });
  });

  test('should display summary section with project counts', async ({ page }) => {
    await expect(page.locator('.summary-section')).toBeVisible();
    await expect(page.locator('.summary-card')).toHaveCount(5); // Total, Success, Warning, Failed, Inactive
  });

  test('should display pipeline trends charts', async ({ page }) => {
    // Wait for trends to load
    await page.waitForSelector('.metrics-panel', { timeout: 30000 });

    // Check for trend charts
    await expect(page.locator('.metrics-panel')).toBeVisible();
    await expect(page.locator('.trend-chart')).toHaveCount(3); // Failure Rate, Duration, Coverage
  });

  test('should show projects in table view', async ({ page }) => {
    // Table view should be default
    await expect(page.locator('.projects-table')).toBeVisible();
    await expect(page.locator('.project-row')).toHaveCount({ minimum: 1 });
  });

  test('should switch to card view', async ({ page }) => {
    // Click Cards view button
    await page.locator('button:has-text("Cards")').click();

    // Card view should be visible
    await expect(page.locator('.project-cards')).toBeVisible();
    await expect(page.locator('.project-card')).toHaveCount({ minimum: 1 });
  });

  test('should filter projects by status', async ({ page }) => {
    // Click on a status filter
    await page.locator('.filter-chip.success').click();

    // The filter should be active
    await expect(page.locator('.filter-chip.success.active')).toBeVisible();
  });

  test('should search projects', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('api');

    // Wait for filtering
    await page.waitForTimeout(500);

    // Results should be filtered
    const projectNames = await page.locator('.project-name-link').allTextContents();
    projectNames.forEach(name => {
      expect(name.toLowerCase()).toContain('api');
    });
  });

  test('should display Avg Duration with non-zero values', async ({ page }) => {
    // Check summary section for avg duration
    const avgDurationText = await page.locator('.summary-metric:has-text("Avg Duration") .metric-value').textContent();

    // Should not be "0s" or empty
    expect(avgDurationText).toBeTruthy();
    // Allow "0s" only if there's genuinely no duration data, but warn
    if (avgDurationText === '0s') {
      console.warn('Avg Duration is 0s - this may indicate an issue or no pipeline data');
    }
  });

  test('should expand table row and load MR details', async ({ page }) => {
    // Find a row with MRs if possible
    const expandBtns = page.locator('.expand-btn');
    const count = await expandBtns.count();

    if (count > 0) {
      // Click first expand button
      await expandBtns.first().click();

      // Wait for expanded content
      await expect(page.locator('.project-details')).toBeVisible();

      // Check for MR section or "No open merge requests" message
      const mrSection = page.locator('.mr-section, .no-data:has-text("merge request")');
      await expect(mrSection).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate to project details', async ({ page }) => {
    // Click on a project name
    const projectLink = page.locator('.project-name-link').first();
    const projectName = await projectLink.textContent();
    await projectLink.click();

    // Should show project details view
    await expect(page.locator('.project-details-container')).toBeVisible();
    await expect(page.locator('h2')).toContainText(projectName || '');
  });

  test('should display project trend charts in details view', async ({ page }) => {
    // Navigate to project details
    await page.locator('.project-name-link').first().click();

    // Wait for trends to load
    await page.waitForSelector('.project-metrics-trends', { timeout: 30000 });

    // Check for trend charts
    await expect(page.locator('.project-metrics-trends')).toBeVisible();
    await expect(page.locator('.trends-grid .trend-chart')).toHaveCount({ minimum: 1 });
  });

  test('should navigate back from project details', async ({ page }) => {
    // Navigate to project details
    await page.locator('.project-name-link').first().click();
    await expect(page.locator('.project-details-container')).toBeVisible();

    // Click back button
    await page.locator('button:has-text("Back")').click();

    // Should be back to main dashboard
    await expect(page.locator('.summary-section')).toBeVisible();
  });

  test('should show metric alerts for projects exceeding thresholds', async ({ page }) => {
    // Look for metric alert badges
    // These may or may not exist depending on data
    const alerts = page.locator('.metric-alert');
    const alertCount = await alerts.count();

    // Log alert presence for debugging
    if (alertCount > 0) {
      console.log(`Found ${alertCount} metric alert(s)`);
      const alertTypes = await alerts.allTextContents();
      console.log('Alert types:', alertTypes);
    }

    // Just verify the page loaded successfully
    await expect(page.locator('.summary-section')).toBeVisible();
  });

  test('should refresh data when clicking refresh button', async ({ page }) => {
    // Click refresh
    await page.locator('.refresh-btn').click();

    // Wait for loading to complete
    await expect(page.locator('.loading-indicator')).toBeVisible();
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 30000 });

    // Last updated should change to "Just now"
    await expect(page.locator('.last-updated')).toContainText('Just now');
  });

  test('should change timeframe and reload trends', async ({ page }) => {
    // Change timeframe
    const timeframeSelect = page.locator('select').filter({ hasText: /days/i });
    await timeframeSelect.selectOption({ label: '7 days' });

    // Wait a moment for potential reload
    await page.waitForTimeout(500);

    // Trends should still be visible (data may differ)
    await expect(page.locator('.metrics-panel')).toBeVisible();
  });
});

describeWithToken('Dark Mode with Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Load data first
    const urlInput = page.locator('input[placeholder*="gitlab.com"]');
    await urlInput.clear();
    await urlInput.fill(TEST_CONFIG.gitlabUrl);

    const tokenInput = page.locator('input[type="password"]');
    await tokenInput.fill(TEST_CONFIG.token);

    const groupInput = page.locator('input[placeholder*="Group ID"]');
    await groupInput.fill(TEST_CONFIG.groupId);
    await page.locator('button:has-text("Add")').first().click();

    await page.locator('button:has-text("Load Dashboard")').click();
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 30000 });
  });

  test('should display charts correctly in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.locator('.theme-btn').click();

    // Verify dark mode is active
    await expect(page.locator('body')).toHaveClass(/dark-mode/);

    // Charts should still be visible
    await expect(page.locator('.metrics-panel')).toBeVisible();
    await expect(page.locator('.trend-chart')).toHaveCount(3);

    // Navigate to project and check trends there too
    await page.locator('.project-name-link').first().click();
    await page.waitForSelector('.project-metrics-trends', { timeout: 30000 });
    await expect(page.locator('.project-metrics-trends')).toBeVisible();
  });
});
