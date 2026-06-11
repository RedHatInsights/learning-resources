import { Page, expect } from '@playwright/test';

// Re-export authentication utilities from shared package
export {
  disableCookiePrompt,
  login,
} from '@redhat-cloud-services/playwright-test-auth';

// Local utility - Path for learning resources
export const LEARNING_RESOURCES_PATH = '/learning-resources';

// Timeout constants (in milliseconds)
export const PAGE_LOAD_TIMEOUT = 60000; // Time to wait for page navigation to complete
export const ELEMENT_VISIBLE_TIMEOUT = 10000; // Time to wait for elements to become visible
export const RESOURCE_COUNT_TIMEOUT = 20000; // Time to wait for resource count to be extracted
export const CHROME_HEADER_LOAD_TIMEOUT = 30000; // Chrome shell header load (federated module + network latency)
export const SUPPORT_API_LOAD_TIMEOUT = 15000; // Support panel API data to load
export const HELP_PANEL_TABS_LOAD_TIMEOUT = 10000; // Help panel tabs to render
export const FEEDBACK_SUBMISSION_TIMEOUT = 10000; // Feedback submission to complete

/**
 * Opens the help panel and waits for it to load
 * @param page - Playwright page object
 */
export async function openHelpPanel(page: Page): Promise<void> {
  await page.getByLabel('Toggle help panel').click();
  const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
  await expect(helpPanelTitle).toBeVisible();
}

/**
 * Switches to a specific help panel tab
 * @param page - Playwright page object
 * @param tabName - Name of the tab to switch to (e.g., 'Learn', 'APIs', 'Support', 'Feedback')
 */
export async function switchToHelpPanelTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('tab', { name: tabName }).click();
}

/**
 * Waits for the help panel tabs container to be fully rendered
 * @param page - Playwright page object
 */
export async function waitForHelpPanelTabsLoaded(page: Page): Promise<void> {
  const tabsContainer = page.locator('[data-ouia-component-id="help-panel-tabs"]');
  await expect(tabsContainer).toBeVisible({ timeout: HELP_PANEL_TABS_LOAD_TIMEOUT });
}

/**
 * Waits for support tab content to load (handles both empty and populated states)
 * @param page - Playwright page object
 */
export async function waitForSupportTabLoaded(page: Page): Promise<void> {
  const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
  const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');
  await expect(emptyState.or(supportTable)).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });
}

/**
 * Navigates to the Feedback tab and waits for the feedback home page to load
 * @param page - Playwright page object
 */
export async function navigateToFeedbackTab(page: Page): Promise<void> {
  await switchToHelpPanelTab(page, 'Feedback');
  const feedbackHomeTitle = page.locator('[data-ouia-component-id="feedback-home-title"]');
  await expect(feedbackHomeTitle).toBeVisible();
}

// Waits for the count to be within the specified range, then returns it
// This handles React rendering timing and filter application delays
export async function waitForCountInRange(page: Page, minCount: number, maxCount: number, timeout: number = RESOURCE_COUNT_TIMEOUT): Promise<number> {
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

  await expect(countElement).toBeAttached({ timeout: RESOURCE_COUNT_TIMEOUT });

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
