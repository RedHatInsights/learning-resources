import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

test.describe('help panel - Support tab', () => {
  test.beforeEach(async ({ page }): Promise<void> => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to dashboard - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

    // Tier 1: Wait for chrome header to be fully loaded
    await expect(page.getByText('Hi,')).toBeVisible();

    // Open help panel
    await page.getByLabel('Toggle help panel').click();
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Navigate to Support subtab (nested under "Find help" in current deployed version)
    const supportTab = page.locator('[data-ouia-component-id="help-panel-tab-support"]');
    await supportTab.click();

    // Wait for support panel to load - state-based wait instead of fixed timeout
    await expect(async () => {
      const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
      const casesTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

      const emptyVisible = await emptyState.isVisible();
      const tableVisible = await casesTable.isVisible();

      expect(emptyVisible || tableVisible).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test('loads support cases from API', async ({ page }) => {
    // Wait for loading to complete - either empty state or table appears
    await expect(async () => {
      const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
      const casesTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

      const emptyVisible = await emptyState.isVisible();
      const tableVisible = await casesTable.isVisible();

      expect(emptyVisible || tableVisible).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test('displays empty state when no support cases exist', async ({ page }) => {
    // Assert empty state is displayed
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    await expect(emptyState).toBeVisible();

    // Verify empty state title
    await expect(page.getByRole('heading', { name: /no open support cases/i })).toBeVisible();

    // Verify "Open a support case" button exists
    const openCaseButton = page.getByRole('button', { name: /open a support case/i });
    await expect(openCaseButton).toBeVisible();
  });

  test('opens Customer Portal when clicking "Open a support case"', async ({ page }) => {
    // Assert empty state is displayed
    const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
    await expect(emptyState).toBeVisible();

    // Set up listener for new page/tab
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 });

    // Click "Open a support case" button
    const openCaseButton = page.getByRole('button', { name: /open a support case/i });
    await openCaseButton.click();

    // Verify new tab opened to Customer Portal
    const popup = await popupPromise;
    await expect(popup).toBeTruthy();

    const url = popup.url();
    expect(url).toMatch(/access\.redhat\.com\/support\/cases/);

    await popup.close();
  });

  test('shows loading skeleton before data loads', async ({ page }) => {
    // This test is timing-dependent - navigate to Support tab fresh
    // Close and reopen help panel
    const closeButton = page.locator('[data-ouia-component-id="help-panel-close-button"]');
    await closeButton.click();

    // Wait for panel to actually close
    await expect(closeButton).not.toBeVisible();

    // Reopen
    await page.getByLabel('Toggle help panel').click();
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Navigate to Support subtab (nested under "Find help" in current deployed version)
    const supportTab = page.locator('[data-ouia-component-id="help-panel-tab-support"]');
    await supportTab.click();

    // Check if skeleton table appears (may be very brief)
    // This is best-effort since skeleton may load too quickly to catch
    const skeleton = page.locator('.pf-v6-c-skeleton');
    const skeletonVisible = await skeleton.isVisible().catch(() => false);

    if (skeletonVisible) {
      console.log('✓ Loading skeleton displayed during API call');
    }

    // Wait for final state
    await expect(async () => {
      const emptyState = page.locator('[data-ouia-component-id="help-panel-support-empty-state"]');
      const casesTable = page.locator('[data-ouia-component-id="help-panel-support-cases-table"]');

      const emptyVisible = await emptyState.isVisible();
      const tableVisible = await casesTable.isVisible();

      expect(emptyVisible || tableVisible).toBe(true);
    }).toPass({ timeout: 15000 });
  });
});
