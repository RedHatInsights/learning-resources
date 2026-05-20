import { test, expect } from '@playwright/test';
import { disableCookiePrompt, PAGE_LOAD_TIMEOUT, ELEMENT_VISIBLE_TIMEOUT } from './test-utils';

// Timeout constants
const TABS_LOAD_TIMEOUT = ELEMENT_VISIBLE_TIMEOUT; // Time to wait for help panel tabs to render

test.describe('help panel', async () => {

  test.beforeEach(async ({page}): Promise<void> => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to dashboard - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: PAGE_LOAD_TIMEOUT });

    // Tier 1: Wait for chrome header to be fully loaded before interacting with help panel
    await expect(page.getByText('Hi,')).toBeVisible();
  });

  test('opens and displays panel title', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();
    // Tier 2: Wait for help panel to finish loading
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();
  });

  test('closes when close button is clicked', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();
    // Tier 2: Wait for help panel to finish loading
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    const closeButton = page.locator('[data-ouia-component-id="help-panel-close-button"]');
    await closeButton.click();

    // Verify the panel is closed by checking if the panel title is no longer visible
    await expect(helpPanelTitle).not.toBeVisible();
  });

  test('displays main tabs', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Tier 2: Wait for help panel to finish loading
    const tabs = page.locator('[data-ouia-component-id="help-panel-tabs"]');
    await expect(tabs).toBeVisible();

    // Verify main tabs are present (Learn, APIs, Support, Feedback)
    await expect(page.getByRole('tab', { name: 'Learn' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'APIs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Support' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Feedback' })).toBeVisible();
  });

  test('allows switching between main tabs', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Tier 2: Wait for help panel to finish loading
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Wait for tabs container to be fully rendered
    const tabsContainer = page.locator('[data-ouia-component-id="help-panel-tabs"]');
    await expect(tabsContainer).toBeVisible({ timeout: TABS_LOAD_TIMEOUT });

    // Click on APIs tab using role selector (PatternFly Tab doesn't pass through OUIA IDs)
    await page.getByRole('tab', { name: 'APIs' }).click();

    // Verify API documentation content is shown by checking for the description text
    await expect(page.getByText(/Browse the APIs for Hybrid Cloud Console services/i)).toBeVisible({ timeout: ELEMENT_VISIBLE_TIMEOUT });
  });

  test('displays status page link in header', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Tier 2: Wait for help panel to finish loading
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // The status page link is rendered inside the Title element, so wait for it explicitly
    const statusPageLink = page.locator('.lr-c-status-page-link');
    await expect(statusPageLink).toBeVisible();
    await expect(statusPageLink).toHaveText('Red Hat status page');
  });

  // Test removed: Add tab functionality no longer exists in single-tier tab structure
});
