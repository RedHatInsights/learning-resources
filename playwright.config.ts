import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  testMatch: /\.spec\.(ts|tsx)$/,
  // Run tests serially to avoid flakiness from parallel execution
  workers: 1,
  // Disable parallel execution within test files
  fullyParallel: false,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  retries: 1,
});
