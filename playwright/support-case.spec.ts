import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

/**
 * Support Case Tests
 *
 * Migrated from IQE: iqe_platform_ui/tests/test_support_case.py
 *
 * These tests verify that support case functionality is accessible from the help panel:
 * - "Open a support case" button appears in the help menu
 * - Clicking the button opens the Red Hat Customer Portal support case page
 *
 * Note: The original IQE test #3 (test_support_case_from_apps) which tests pre-filled
 * support case data from different apps was not migrated here as it requires complex
 * cross-domain interaction and is better suited for insights-chrome repository.
 *
 * Requirements:
 * - PLATFORM_UI-INSIGHTS_CHROME
 * - PLATFORM_UI-SUPPORT_CASES
 */

// Timeout constants
const SUPPORT_API_LOAD_TIMEOUT = 15000; // Time to wait for support cases API to load
const ELEMENT_VISIBLE_TIMEOUT = 10000; // Time to wait for elements to become visible
const EXTERNAL_PAGE_LOAD_TIMEOUT = 30000; // Time to wait for external pages to load

test.describe('Support Case - Help Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to home page - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

    // Wait for chrome header to be fully loaded
    await expect(page.getByText('Hi,')).toBeVisible();
  });

  test('should display "Open a support case" button in help panel', async ({ page }) => {
    // Open the help panel
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Click on "My support cases" tab
    const supportTab = page.locator('[data-ouia-component-id="help-panel-subtab-support"]');
    await supportTab.click();

    // The support panel should show either:
    // 1. Empty state with "Open a support case" button (if user has no cases)
    // 2. Table of support cases (if user has cases)
    // We'll check for both possibilities

    // The support panel will show either empty state or table after loading
    // Use Playwright's auto-retry to wait for one of them to appear
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

    // Wait for either empty state or table to be visible
    await expect(async () => {
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);
      const tableVisible = await supportTable.isVisible().catch(() => false);
      expect(emptyStateVisible || tableVisible).toBe(true);
    }).toPass({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // If empty state is shown, verify the "Open a support case" button is present
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    if (emptyStateVisible) {
      const openCaseButton = page.locator('[data-ouia-component-id="help-panel-open-support-case-button"]');
      await expect(openCaseButton).toBeVisible({ timeout: ELEMENT_VISIBLE_TIMEOUT });
      await expect(openCaseButton).toHaveText(/open a support case/i);
    }
  });

  test('should open Customer Portal when clicking "Open a support case" button', async ({ page, context }) => {
    // Open the help panel
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Click on "My support cases" tab
    const supportTab = page.locator('[data-ouia-component-id="help-panel-subtab-support"]');
    await supportTab.click();

    // The support panel will show either empty state or table after loading
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

    // Wait for either empty state or table to be visible
    await expect(async () => {
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);
      const tableVisible = await supportTable.isVisible().catch(() => false);
      expect(emptyStateVisible || tableVisible).toBe(true);
    }).toPass({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Check if empty state with button is displayed
    const openCaseButton = page.locator('[data-ouia-component-id="help-panel-open-support-case-button"]');
    const buttonVisible = await openCaseButton.isVisible().catch(() => false);

    // Only run the click test if the button is visible (user has no cases)
    // If user has cases, the button won't be in the empty state
    if (!buttonVisible) {
      test.skip();
      return;
    }

    // Set up listener for new page/tab before clicking
    const pagePromise = context.waitForEvent('page');

    // Click the "Open a support case" button
    await openCaseButton.click();

    // Wait for new page to open
    const newPage = await pagePromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: EXTERNAL_PAGE_LOAD_TIMEOUT });

    // Verify the new page URL is the Red Hat Customer Portal support case page
    expect(newPage.url()).toContain('access.redhat.com/support');

    // Clean up - close the new tab
    await newPage.close();
  });

  test('should display support cases table when user has open cases', async ({ page }) => {
    // Open the help panel
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Click on "My support cases" tab
    const supportTab = page.locator('[data-ouia-component-id="help-panel-subtab-support"]');
    await supportTab.click();

    // The support panel will show either empty state or table after loading
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

    // Wait for either empty state or table to be visible
    await expect(async () => {
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);
      const tableVisible = await supportTable.isVisible().catch(() => false);
      expect(emptyStateVisible || tableVisible).toBe(true);
    }).toPass({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Check if table is displayed
    const tableVisible = await supportTable.isVisible().catch(() => false);

    // This test only runs if user has support cases
    if (!tableVisible) {
      test.skip();
      return;
    }

    // Verify table is visible
    await expect(supportTable).toBeVisible();

    // Verify pagination is present (shown when there are cases)
    const pagination = page.locator('[data-ouia-component-id="help-panel-support-pagination"]');
    await expect(pagination).toBeVisible();

    // Verify table has at least one row (case)
    const tableRows = supportTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
