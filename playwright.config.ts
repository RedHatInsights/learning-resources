import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  testMatch: /\.spec\.(ts|tsx)$/,
  // Run tests serially to avoid flakiness from parallel execution
  workers: 1,
  // Disable parallel execution within test files
  fullyParallel: false,
  // Base URL can be overridden with PLAYWRIGHT_BASE_URL environment variable
  // For local development, use https://stage.foo.redhat.com:1337
  // For CI/remote stage, use https://console.stage.redhat.com
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://stage.foo.redhat.com:1337',
    ignoreHTTPSErrors: true,
  },
});
