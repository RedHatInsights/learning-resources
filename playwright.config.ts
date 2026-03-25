import { defineConfig, devices } from '@playwright/test';

// Simulate slow CI environment with SLOW_CI=1 environment variable
const simulateSlowCI = process.env.SLOW_CI === '1';

export default defineConfig({
  testDir: './playwright',
  testMatch: /\.spec\.(ts|tsx)$/,
  // Run tests serially to avoid flakiness from parallel execution
  workers: 1,
  // Disable parallel execution within test files
  fullyParallel: false,
  // Timeout for each test (includes beforeEach/afterEach hooks)
  timeout: 90000,
  // Authenticate once before all tests
  globalSetup: require.resolve('./playwright/global-setup.ts'),
  // Base URL can be overridden with PLAYWRIGHT_BASE_URL environment variable
  // For local development, use https://stage.foo.redhat.com:1337
  // For CI/remote stage, use https://console.stage.redhat.com
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://stage.foo.redhat.com:1337',
    ignoreHTTPSErrors: true,
    // Use saved authentication state from global setup
    storageState: 'playwright/.auth/user.json',
    // Slow down operations when simulating CI
    ...(simulateSlowCI && {
      launchOptions: {
        slowMo: 50, // Slows down Playwright operations by 50ms each
      },
    }),
  },
});
