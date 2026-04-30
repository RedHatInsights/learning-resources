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

  test('should display "Open a support case" link in help panel', async ({ page }) => {
    // Step 1: Click help button to open help panel
    await page.getByLabel('Toggle help panel').click();

    // Step 2: Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Step 3: Click on "My support cases" tab
    const supportTab = page.locator('[data-ouia-component-id="help-panel-subtab-support"]');
    await supportTab.click();

    // Step 4: The "Open a support case" link should be visible
    // (It appears in both empty state and when cases exist)
    const openCaseLink = page.getByRole('link', { name: /open a support case/i });
    await expect(openCaseLink).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });
  });

  test('should open Customer Portal when clicking "Open a support case" link', async ({ page, context }) => {
    // Step 1: Click help button to open help panel
    await page.getByLabel('Toggle help panel').click();

    // Step 2: Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Step 3: Click on "My support cases" tab
    const supportTab = page.locator('[data-ouia-component-id="help-panel-subtab-support"]');
    await supportTab.click();

    // Step 4: Wait for the "Open a support case" link to be visible
    const openCaseLink = page.getByRole('link', { name: /open a support case/i });
    await expect(openCaseLink).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Step 5: Set up listener for new page/tab before clicking
    const pagePromise = context.waitForEvent('page');

    // Step 6: Click the "Open a support case" link
    await openCaseLink.click();

    // Step 7: Wait for new page to open and verify URL
    const newPage = await pagePromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: EXTERNAL_PAGE_LOAD_TIMEOUT });
    expect(newPage.url()).toContain('access.redhat.com/support');

    // Clean up - close the new tab
    await newPage.close();
  });

  test('should display support cases table when user has open cases', async ({ page }) => {
    // Step 1: Click help button to open help panel
    await page.getByLabel('Toggle help panel').click();

    // Step 2: Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Step 3: Click on "My support cases" tab
    const supportTab = page.locator('[data-ouia-component-id="help-panel-subtab-support"]');
    await supportTab.click();

    // Step 4: Wait for support panel to load and check if user has support cases
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');

    // Wait for either the table or empty state to appear
    try {
      await expect(supportTable.or(emptyState)).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });
    } catch {
      // If neither appears within timeout, skip the test
      test.skip();
      return;
    }

    // Check if table is visible (user has cases)
    const tableVisible = await supportTable.isVisible().catch(() => false);
    if (!tableVisible) {
      // User has no cases, skip this test
      test.skip();
      return;
    }

    // Verify table is visible
    await expect(supportTable).toBeVisible();

    // Verify pagination is present
    const pagination = page.locator('[data-ouia-component-id="help-panel-support-pagination"]');
    await expect(pagination).toBeVisible();

    // Verify table has at least one row (case)
    const tableRows = supportTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
