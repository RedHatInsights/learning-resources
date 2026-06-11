import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

test.describe('help panel - API tab', () => {
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

    // Navigate to API subtab (nested under "Find help" in current deployed version)
    const apiTab = page.locator('[data-ouia-component-id="help-panel-tab-api"]');
    await apiTab.click();
    await expect(page.locator('[data-ouia-component-id="help-panel-api-root"]')).toBeVisible();
  });

  test('loads API documentation from API', async ({ page }) => {
    // Wait for API docs to load
    const resourcesList = page.locator('[data-ouia-component-id="help-panel-api-resources-list"]');
    await expect(resourcesList).toBeVisible({ timeout: 15000 });

    // Verify results count is displayed
    const toolbar = page.locator('[data-ouia-component-id="help-panel-api-results-toolbar"]');
    await expect(toolbar).toContainText(/API Documentation \(\d+\)/);

    // Verify at least one API doc is displayed
    const dataListItems = page.locator('[data-ouia-component-id="help-panel-api-resources-list"] .pf-v6-c-data-list__item');
    await expect(dataListItems.first()).toBeVisible();

    // Verify service labels are displayed (bundle tags)
    const serviceLabels = page.locator('[data-ouia-component-id="help-panel-api-resources-list"] .pf-v6-c-label');
    await expect(serviceLabels.first()).toBeVisible();
  });

  test('displays API Documentation Catalog link', async ({ page }) => {
    // Verify description text and catalog link
    const catalogLink = page.getByRole('link', { name: 'API Documentation Catalog' });
    await expect(catalogLink).toBeVisible();
    await expect(catalogLink).toHaveAttribute('href', '/docs/api');
  });
});
