import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  testMatch: /\.spec\.(ts|tsx)$/,
  // Run tests serially to avoid flakiness from parallel execution
  workers: 1,
  // Disable parallel execution within test files
  fullyParallel: false,
  // Global setup to perform login once before all tests (custom version with proxy support)
  globalSetup: './playwright/global-setup-with-proxy.ts',
  // Default timeout for element lookups and assertions
  expect: {
    timeout: 10000,
  },
  use: {
    // Base URL for all tests - use environment variable or default to stage
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://console.stage.redhat.com',
    // Reuse authentication state across all tests
    storageState: './playwright/.auth/user.json',
    // Ignore HTTPS errors globally
    ignoreHTTPSErrors: true,
    // Optional proxy support via environment variable
    ...(process.env.E2E_PROXY && { proxy: { server: process.env.E2E_PROXY } }),
  },
});
