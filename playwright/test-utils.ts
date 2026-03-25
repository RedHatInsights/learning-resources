import { Page, expect } from '@playwright/test';

// Base URL is configured in playwright.config.ts
// Default: https://stage.foo.redhat.com:1337 (for local dev proxy)
// Can be overridden with PLAYWRIGHT_BASE_URL environment variable
export const LEARNING_RESOURCES_URL = '/learning-resources';

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

// Logs out the current user to ensure clean state between tests
export async function logout(page: Page): Promise<void> {
  // Click the user menu in the masthead
  const userMenuButton = page.locator('[data-ouia-component-id="UserMenu"]');
  const isVisible = await userMenuButton.isVisible().catch(() => false);

  if (!isVisible) {
    // Not logged in or dashboard not visible, nothing to do
    return;
  }

  await userMenuButton.click();

  // Click logout button in the dropdown
  await page.getByRole('menuitem', { name: 'Log out' }).click();

  // Wait for logout to complete (should redirect to login or landing page)
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

// Shared login logic for test beforeEach blocks
// Handles fresh login, server-side SSO session persistence, and "Access Denied" errors
// NOTE: disableCookiePrompt must be called BEFORE this function in beforeEach hooks
export async function ensureLoggedIn(page: Page): Promise<void> {
  const user = process.env.E2E_USER!;
  const password = process.env.E2E_PASSWORD!;

  await page.goto('/', { waitUntil: 'load', timeout: 60000 });

  // Check if we hit "Access Denied" - if so, retry navigation
  const accessDenied = await page.getByText('Access Denied').isVisible({ timeout: 2000 }).catch(() => false);
  if (accessDenied) {
    // Wait a bit and retry navigation to allow SSO to reset
    await page.waitForTimeout(3000);
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });
  }

  // Wait for either dashboard or login page to appear after navigation/redirects
  const dashboardButton = page.getByRole('button', { name: 'Add widgets' });
  const loginField = page.getByLabel('Red Hat login').first();

  // Race to see which appears first (handles both authenticated and unauthenticated states)
  // Give it 45s to account for slow SSO redirects in CI
  const winner = await Promise.race([
    dashboardButton.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'dashboard'),
    loginField.waitFor({ state: 'visible', timeout: 45000 }).then(() => 'login')
  ]).catch(() => null);

  if (winner === 'dashboard') {
    // Already authenticated
    return;
  }

  if (winner === 'login') {
    // Need to perform login
    await loginField.fill(user);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Password').first().fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    // Wait for dashboard to appear
    await expect(dashboardButton, 'dashboard not displayed after login').toBeVisible({ timeout: 30000 });

    // Conditionally accept cookie prompt
    const acceptAllButton = page.getByRole('button', { name: 'Accept all'});
    if (await acceptAllButton.isVisible()) {
      await acceptAllButton.click();
    }
    return;
  }

  // Neither dashboard nor login appeared
  throw new Error('Page did not load dashboard or login form - got blank page or unexpected state');
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
