import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for GitLab CI/CD Dashboard
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',

  use: {
    // Use environment variable or default to localhost for local testing
    baseURL: process.env.BASE_URL || 'http://localhost:5050',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport for responsive testing
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server if testing locally (not in CI)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5050',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
