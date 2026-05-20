import { test, expect } from '@playwright/test';
import { disableCookiePrompt, PAGE_LOAD_TIMEOUT } from './test-utils';
import {
  openSupportPanel,
  isEmptyState,
  getSupportPanelLocators,
  SUPPORT_API_LOAD_TIMEOUT,
} from './support-case-helpers';

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

test.describe('Support Case - Help Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to home page - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: PAGE_LOAD_TIMEOUT });

    // Wait for chrome header to be fully loaded
    await expect(page.getByText('Hi,')).toBeVisible();
  });

  test('should display "Open a support case" link in help panel', async ({ page }) => {
    // Open help panel and navigate to Support tab
    await openSupportPanel(page);

    // Get locators for support panel elements
    const { emptyState, supportTable, openCaseButton } = getSupportPanelLocators(page);

    // The "Open a support case" CTA appears only in empty state
    // When cases exist, the CTA is not present in the same location
    if (await isEmptyState(page)) {
      // Empty state: verify the "Open a support case" button is visible
      await expect(openCaseButton).toBeVisible();
    } else {
      // Cases exist: verify the table is visible instead
      await expect(supportTable).toBeVisible();
    }
  });

  test('should open Customer Portal when clicking "Open a support case" link', async ({ page, context }) => {
    // Open help panel and navigate to Support tab
    await openSupportPanel(page);

    // Verify empty state is visible (CTA only appears in empty state)
    // Skip this test if user has actual cases
    if (!await isEmptyState(page)) {
      test.skip();
      return;
    }

    // Get the "Open a support case" button
    const { openCaseButton } = getSupportPanelLocators(page);

    // Set up listener for new page/tab before clicking
    const pagePromise = context.waitForEvent('page');

    // Click the "Open a support case" button
    await openCaseButton.click();

    // Wait for new page to open and verify it navigates to Red Hat Customer Portal
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
    // Open help panel and navigate to Support tab
    await openSupportPanel(page);

    // Check if empty state is visible (user has no cases)
    if (await isEmptyState(page)) {
      // User has no cases, skip this test
      test.skip();
      return;
    }

    // Get locators for support panel elements
    const { supportTable, pagination } = getSupportPanelLocators(page);

    // Verify table is visible
    await expect(supportTable).toBeVisible();

    // Verify pagination is present
    await expect(pagination).toBeVisible();

    // Verify table has at least one row (case)
    const tableRows = supportTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
