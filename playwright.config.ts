import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000, // Increase global test timeout to 60s for slow stage environment

  // Global setup runs once before all tests to perform login
  globalSetup: require.resolve('./playwright/global-setup'),

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // Global timeout for actions (click, fill, etc.) - stage is slow
    // Use saved authentication state for all tests
    storageState: 'playwright/.auth/storageState.json',
  },

  // Global timeout for expect() assertions
  expect: {
    timeout: 30000, // Global timeout for expect assertions - stage is slow
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
