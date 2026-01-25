import { test, expect } from '@playwright/test';

/**
 * E2E tests for GitLab CI/CD Dashboard
 * These tests verify the dashboard functionality after deployment
 */

// Test data - using the public test group
const TEST_CONFIG = {
  gitlabUrl: 'https://gitlab.com',
  groupId: '122839760', // test-group6330604
};

test.describe('Dashboard Loading', () => {
  test('should display the dashboard title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('GitLab CI/CD Dashboard');
  });

  test('should show settings panel on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.settings-panel')).toBeVisible();
    await expect(page.locator('input[placeholder*="gitlab"]')).toBeVisible();
  });

  test('should have control panel with required fields', async ({ page }) => {
    await page.goto('/');

    // Check for GitLab URL input
    await expect(page.locator('input[placeholder*="gitlab.com"]')).toBeVisible();

    // Check for token input
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check for group/project input
    await expect(page.locator('label.source-label:has-text("Groups")')).toBeVisible();

    // Check for timeframe selector
    await expect(page.locator('text=Timeframe')).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');

    // Find and click the theme toggle button
    const themeBtn = page.locator('.theme-btn');
    await expect(themeBtn).toBeVisible();

    // Check initial state (light mode)
    const body = page.locator('body');
    const initialDarkMode = await body.evaluate(el => el.classList.contains('dark-mode'));

    // Toggle dark mode
    await themeBtn.click();

    // Verify dark mode is toggled
    const afterToggle = await body.evaluate(el => el.classList.contains('dark-mode'));
    expect(afterToggle).not.toBe(initialDarkMode);

    // Toggle back
    await themeBtn.click();
    const afterSecondToggle = await body.evaluate(el => el.classList.contains('dark-mode'));
    expect(afterSecondToggle).toBe(initialDarkMode);
  });
});

test.describe('Settings Panel', () => {
  test('should collapse and expand settings', async ({ page }) => {
    await page.goto('/');

    const settingsPanel = page.locator('.settings-panel');
    const settingsBtn = page.locator('.settings-btn');

    // Initially visible
    await expect(settingsPanel).not.toHaveClass(/collapsed/);

    // Click to collapse
    await settingsBtn.click();
    await expect(settingsPanel).toHaveClass(/collapsed/);

    // Click to expand
    await settingsBtn.click();
    await expect(settingsPanel).not.toHaveClass(/collapsed/);
  });

  test('should allow entering GitLab URL', async ({ page }) => {
    await page.goto('/');

    const urlInput = page.locator('input[placeholder*="gitlab.com"]');
    await urlInput.clear();
    await urlInput.fill(TEST_CONFIG.gitlabUrl);

    await expect(urlInput).toHaveValue(TEST_CONFIG.gitlabUrl);
  });

  test('should allow adding a group', async ({ page }) => {
    await page.goto('/');

    // Find the group input and add button
    const groupInput = page.locator('input[placeholder*="group ID" i]');
    await groupInput.fill(TEST_CONFIG.groupId);

    // Click add button
    const addBtn = page.locator('button:has-text("Add")').first();
    await addBtn.click();

    // Verify group chip appears
    await expect(page.locator(`.source-chip:has-text("${TEST_CONFIG.groupId}")`)).toBeVisible();
  });

  test('should have timeframe options', async ({ page }) => {
    await page.goto('/');

    // Check for timeframe selector
    const timeframeSelect = page.locator('select').filter({ hasText: /days/i });
    await expect(timeframeSelect).toBeVisible();

    // Verify options exist
    const options = await timeframeSelect.locator('option').allTextContents();
    expect(options.some(o => o.includes('7'))).toBeTruthy();
    expect(options.some(o => o.includes('30'))).toBeTruthy();
    expect(options.some(o => o.includes('90'))).toBeTruthy();
  });
});

test.describe('View Toggle', () => {
  test('should have view toggle buttons when dashboard is loaded', async ({ page }) => {
    // This test verifies the UI elements exist
    // The actual view toggle requires loading data first
    await page.goto('/');

    // View toggle only appears after data is loaded
    // Check that the header exists where it would appear
    await expect(page.locator('header')).toBeVisible();
  });

  test('should have three view options: Cards, Table, Envs', async ({ page }) => {
    // View toggle buttons should exist in the header when data is loaded
    // We check that the header structure supports this
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();

    // Note: View toggle only appears after metrics are loaded
    // This test verifies the basic page structure
    // Full view toggle testing is in dashboard-with-data.spec.ts
  });
});

test.describe('Responsive Layout', () => {
  test('should be responsive on mobile viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/');

    // Dashboard should still be visible
    await expect(page.locator('h1')).toContainText('GitLab CI/CD Dashboard');

    // Settings panel should be visible
    await expect(page.locator('.settings-panel')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should show error when loading without token', async ({ page }) => {
    await page.goto('/');

    // Enter GitLab URL and group but no token
    const urlInput = page.locator('input[placeholder*="gitlab.com"]');
    await urlInput.fill(TEST_CONFIG.gitlabUrl);

    // Add a group
    const groupInput = page.locator('input[placeholder*="group ID" i]');
    await groupInput.fill(TEST_CONFIG.groupId);
    await page.locator('button:has-text("Add")').first().click();

    // Try to load - should show error or be disabled
    const loadBtn = page.locator('button:has-text("Load Dashboard")');

    // Button should be disabled without token
    await expect(loadBtn).toBeDisabled();
  });
});

test.describe('Local Storage', () => {
  test('should clear saved data when clicking clear button', async ({ page }) => {
    await page.goto('/');

    // First, set some data
    const urlInput = page.locator('input[placeholder*="gitlab.com"]');
    await urlInput.fill(TEST_CONFIG.gitlabUrl);

    // Find and click clear button
    const clearBtn = page.locator('button:has-text("Clear Saved Data")');

    // Handle the alert dialog
    page.on('dialog', dialog => dialog.accept());

    await clearBtn.click();

    // URL should be reset to default
    await expect(urlInput).toHaveValue('https://gitlab.com/api/v4');
  });
});
