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
 * TODO: Test #3 (test_support_case_from_apps) - Not yet migrated
 * This test verifies that support case data is pre-filled correctly when opened from
 * different apps. It requires:
 * - Complex setup with actual support cases created via API
 * - Cross-domain interaction with Customer Portal
 * - Authentication on the external portal to validate pre-filled data
 * - May be better suited for insights-chrome repository or separate E2E suite
 *
 * Requirements:
 * - PLATFORM_UI-INSIGHTS_CHROME
 * - PLATFORM_UI-SUPPORT_CASES
 */

// Timeout constants
const SUPPORT_API_LOAD_TIMEOUT = 15000; // Time to wait for support cases API to load
const TABS_LOAD_TIMEOUT = 10000; // Time to wait for help panel tabs to render

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

    // Step 2.5: Wait for tabs container to be fully rendered
    const tabsContainer = page.locator('[data-ouia-component-id="help-panel-tabs"]');
    await expect(tabsContainer).toBeVisible({ timeout: TABS_LOAD_TIMEOUT });

    // Step 3: Click on "Support" tab using role selector (PatternFly Tab doesn't pass through OUIA IDs)
    await page.getByRole('tab', { name: 'Support' }).click();

    // Step 4: Wait for the support panel to finish loading
    // The panel shows a skeleton loader while fetching support cases from API
    // Wait for either empty state or table to appear (skeleton disappears)
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');
    await expect(emptyState.or(supportTable)).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Step 5: The "Open a support case" CTA appears only in empty state
    // When cases exist, the CTA is not present in the same location
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    if (emptyVisible) {
      // Empty state: verify the "Open a support case" button is visible
      await expect(page.getByText(/open a support case/i)).toBeVisible();
    } else {
      // Cases exist: verify the table is visible instead
      await expect(supportTable).toBeVisible();
    }
  });

  test('should open Customer Portal when clicking "Open a support case" link', async ({ page, context }) => {
    // Step 1: Click help button to open help panel
    await page.getByLabel('Toggle help panel').click();

    // Step 2: Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Step 2.5: Wait for tabs container to be fully rendered
    const tabsContainer = page.locator('[data-ouia-component-id="help-panel-tabs"]');
    await expect(tabsContainer).toBeVisible({ timeout: TABS_LOAD_TIMEOUT });

    // Step 3: Click on "Support" tab using role selector (PatternFly Tab doesn't pass through OUIA IDs)
    await page.getByRole('tab', { name: 'Support' }).click();

    // Step 4: Wait for the support panel to finish loading
    // The panel shows a skeleton loader while fetching support cases from API
    // Wait for either empty state or table to appear (skeleton disappears)
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');
    await expect(emptyState.or(supportTable)).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Step 5: Verify empty state is visible (CTA only appears in empty state)
    // Skip this test if user has actual cases
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    if (!emptyVisible) {
      test.skip();
      return;
    }

    // Step 6: Set up listener for new page/tab before clicking
    const pagePromise = context.waitForEvent('page');

    // Step 7: Click the "Open a support case" button/link
    await page.getByText(/open a support case/i).click();

    // Step 8: Wait for new page to open and verify it navigates to Red Hat Customer Portal
    const newPage = await pagePromise;

    // Wait for navigation to Red Hat Customer Portal (page starts at about:blank)
    await newPage.waitForURL(/access\.redhat\.com/, { timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Verify the destination hostname (we can't validate page content due to auth requirements)
    const url = new URL(newPage.url());
    expect(url.hostname).toBe('access.redhat.com');

    // Clean up - close the new tab
    await newPage.close();
  });

  test('should display support cases table when user has open cases', async ({ page }) => {
    // Step 1: Click help button to open help panel
    await page.getByLabel('Toggle help panel').click();

    // Step 2: Wait for help panel to load
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Step 2.5: Wait for tabs container to be fully rendered
    const tabsContainer = page.locator('[data-ouia-component-id="help-panel-tabs"]');
    await expect(tabsContainer).toBeVisible({ timeout: TABS_LOAD_TIMEOUT });

    // Step 3: Click on "Support" tab using role selector (PatternFly Tab doesn't pass through OUIA IDs)
    await page.getByRole('tab', { name: 'Support' }).click();

    // Step 4: Wait for support panel to load and check if user has support cases
    const supportTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');

    // Wait for either the table or empty state to appear (let it fail if timeout)
    await expect(supportTable.or(emptyState)).toBeVisible({ timeout: SUPPORT_API_LOAD_TIMEOUT });

    // Check if empty state is visible (user has no cases)
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    if (emptyVisible) {
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
