import { Page, expect } from '@playwright/test';

// Base URL is configured in playwright.config.ts
// Default: https://stage.foo.redhat.com:1337 (for local dev proxy)
// Can be overridden with PLAYWRIGHT_BASE_URL environment variable
export const LEARNING_RESOURCES_URL = '/learning-resources';

// Navigate to learning resources page via UI instead of page.goto()
// This avoids redirect issues with SSO
export async function navigateToLearningResources(page: Page): Promise<void> {
  await page.getByLabel('Toggle help panel').click();
  await page.getByRole('link', { name: 'All Learning Catalog' }).click();
  await page.waitForLoadState('load');
}

// Prevents inconsistent cookie prompting that is problematic for UI testing
export async function disableCookiePrompt(page: Page) {
  await page.route('**/*', async (route, request) => {
    if (request.url().includes('consent.trustarc.com') && request.resourceType() !== 'document') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
}

export async function login(page: Page, user: string, password: string): Promise<void> {
  // Fail in a friendly way if the proxy config is not set up correctly
  await expect(page.locator("text=Lockdown"), 'proxy config incorrect').toHaveCount(0)

  await disableCookiePrompt(page)

  // Wait for and fill username field
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();

  // Wait for and fill password field
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // confirm login was valid
  await expect(page.getByText('Invalid login')).not.toBeVisible();
}

// Shared login logic for test beforeEach blocks
// Simple approach: check if logged in, if not, login
export async function ensureLoggedIn(page: Page): Promise<void> {
  const user = process.env.E2E_USER!;
  const password = process.env.E2E_PASSWORD!;

  await page.goto('/', { waitUntil: 'load', timeout: 60000 });

  // Check if already on dashboard (logged in)
  const onDashboard = await page.getByRole('button', { name: 'Add widgets' })
    .isVisible({ timeout: 10000 })
    .catch(() => false);

  if (onDashboard) {
    return;
  }

  // Not logged in, perform login
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for dashboard
  await expect(page.getByRole('button', { name: 'Add widgets' })).toBeVisible({ timeout: 30000 });

  // Wait for dashboard chrome to fully load (help panel toggle is a good indicator)
  await page.getByLabel('Toggle help panel').waitFor({ state: 'visible', timeout: 15000 });
}

// Waits for the count to be within the specified range, then returns it
// This handles React rendering timing and filter application delays
export async function waitForCountInRange(page: Page, minCount: number, maxCount: number, timeout: number = 20000): Promise<number> {
  // Target the tab that shows a number (avoids matching placeholder "All learning resources ()")
  const countElement = page.getByText(/All learning resources \(\d+\)/).first();

  // Wait for element to exist
  await countElement.waitFor({ state: 'attached', timeout });

  // Poll until count is within range
  await expect(async () => {
    const text = await countElement.textContent();
    const match = text?.match(/All learning resources \((\d+)\)/);

    if (!match || !match[1]) {
      throw new Error(`Count not yet rendered: "${text}"`);
    }

    const count = parseInt(match[1], 10);

    if (isNaN(count)) {
      throw new Error(`Invalid count: "${match[1]}"`);
    }

    // Verify count is within expected range
    expect(count).toBeGreaterThanOrEqual(minCount);
    expect(count).toBeLessThanOrEqual(maxCount);
  }).toPass({ timeout });

  // Extract final count
  const text = await countElement.textContent();
  const match = text?.match(/All learning resources \((\d+)\)/);
  return parseInt(match![1], 10);
}

// Extracts the count from "All learning resources (N)" text
// Use waitForCountInRange if you need to wait for a specific range after filtering
export async function extractResourceCount(page: Page): Promise<number> {
  // Target the tab that already shows a number (avoids matching placeholder "All learning resources ()")
  const countElement = page.getByText(/All learning resources \(\d+\)/);

  await expect(countElement).toBeAttached({ timeout: 20000 });

  const countText = await countElement.first().textContent();
  const match = countText?.match(/All learning resources \((\d+)\)/);

  if (!match || !match[1]) {
    throw new Error(`Failed to extract valid count from text: "${countText}"`);
  }

  const actualCount = parseInt(match[1], 10);

  if (isNaN(actualCount) || actualCount <= 0) {
    throw new Error(`Failed to parse valid positive count from text: "${countText}". Extracted: "${match[1]}"`);
  }

  return actualCount;
}
