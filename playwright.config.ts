import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  testMatch: /\.spec\.(ts|tsx)$/,
  // Run tests serially to avoid flakiness from parallel execution
  workers: 1,
  // Disable parallel execution within test files
  fullyParallel: false,
  // Global setup to perform login once before all tests
  globalSetup: './playwright/global-setup.ts',
  use: {
    // Base URL for all tests - use environment variable or default to stage
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://stage.foo.redhat.com:1337',
    // Reuse authentication state across all tests
    storageState: './playwright/.auth/user.json',
    // Ignore HTTPS errors globally
    ignoreHTTPSErrors: true,
  },
});
