import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

test.describe('help panel', async () => {

  test.beforeEach(async ({page}): Promise<void> => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to dashboard - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

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

    // Click on APIs tab
    const apiTab = page.locator('[data-ouia-component-id="help-panel-tab-api"]');
    await apiTab.click();

    // Verify API documentation content is shown by checking for the description text
    await expect(page.getByText(/Browse the APIs for Hybrid Cloud Console services/i)).toBeVisible({ timeout: 10000 });
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
