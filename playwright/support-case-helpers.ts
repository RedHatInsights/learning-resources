import { Page, expect } from '@playwright/test';
import { ELEMENT_VISIBLE_TIMEOUT } from './test-utils';

/**
 * Support Case Test Helpers
 *
 * Page object helpers for support case tests that encapsulate common interactions
 * with the help panel's Support tab. This reduces duplication across test files.
 */

// Timeout constants
export const SUPPORT_API_LOAD_TIMEOUT = 15000; // Time to wait for support cases API to load
export const TABS_LOAD_TIMEOUT = ELEMENT_VISIBLE_TIMEOUT; // Time to wait for help panel tabs to render

/**
 * Opens the help panel and waits for it to be fully loaded
 */
export async function openHelpPanel(page: Page): Promise<void> {
  // Click help button to open help panel
  await page.getByLabel('Toggle help panel').click();

  // Wait for help panel title to be visible
  const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
  await expect(helpPanelTitle).toBeVisible();

  // Wait for tabs container to be fully rendered
  const tabsContainer = page.locator('[data-ouia-component-id="help-panel-tabs"]');
  await expect(tabsContainer).toBeVisible({ timeout: TABS_LOAD_TIMEOUT });
}

/**
 * Clicks on the Support tab in the help panel
 * Note: Must call openHelpPanel() first
 */
export async function navigateToSupportTab(page: Page): Promise<void> {
  // Click on "Support" tab using role selector (PatternFly Tab doesn't pass through OUIA IDs)
  await page.getByRole('tab', { name: 'Support' }).click();
}

/**
 * Waits for the support panel to finish loading
 * The panel shows a skeleton loader while fetching support cases from API
 * This waits for either the empty state or table to appear (skeleton disappears)
 */
export async function waitForSupportPanelLoaded(page: Page): Promise<void> {
  const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
  const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

  await expect(emptyState.or(supportTable)).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });
}

/**
 * Opens help panel and navigates to Support tab
 * Convenience method that combines openHelpPanel() and navigateToSupportTab()
 */
export async function openSupportPanel(page: Page): Promise<void> {
  await openHelpPanel(page);
  await navigateToSupportTab(page);
  await waitForSupportPanelLoaded(page);
}

/**
 * Checks if the support panel is showing the empty state (no cases)
 * Returns true if empty state is visible, false if cases table is visible
 */
export async function isEmptyState(page: Page): Promise<boolean> {
  const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
  return await emptyState.isVisible().catch(() => false);
}

/**
 * Gets locators for common support panel elements
 */
export function getSupportPanelLocators(page: Page) {
  return {
    emptyState: page.locator('[data-ouia-component-id="help-panel-support-empty-state"]'),
    supportTable: page.locator('[data-ouia-component-id="help-panel-support-cases-table"]'),
    pagination: page.locator('[data-ouia-component-id="help-panel-support-pagination"]'),
    openCaseButton: page.getByRole('button', { name: 'Open a support case' }),
  };
}
