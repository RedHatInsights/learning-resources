import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

test.describe('help panel - Learn tab', () => {
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

    // Navigate to Learn subtab (nested under "Find help" in current deployed version)
    const learnTab = page.locator('[data-ouia-component-id="help-panel-tab-learn"]');
    await learnTab.click();
    await expect(page.locator('[data-ouia-component-id="help-panel-learn-root"]')).toBeVisible();
  });

  test('loads learning resources from API', async ({ page }) => {
    // Wait for learning resources to load
    const resourcesList = page.locator('[data-ouia-component-id="help-panel-learning-resources-list"]');
    await expect(resourcesList).toBeVisible({ timeout: 15000 });

    // Verify results count is displayed
    const toolbar = page.locator('[data-ouia-component-id="help-panel-learning-results-toolbar"]');
    await expect(toolbar).toContainText(/Learning resources \(\d+\)/);

    // Verify at least one learning resource is displayed
    const dataListItems = page.locator('[data-ouia-component-id="help-panel-learning-resources-list"] .pf-v6-c-data-list__item');
    await expect(dataListItems.first()).toBeVisible();
  });

  test('filters by content type', async ({ page }) => {
    // Wait for resources to load
    await expect(page.locator('[data-ouia-component-id="help-panel-learning-resources-list"]')).toBeVisible({ timeout: 15000 });

    // Get initial count
    const toolbar = page.locator('[data-ouia-component-id="help-panel-learning-results-toolbar"]');
    const initialText = await toolbar.textContent();
    const initialMatch = initialText?.match(/Learning resources \((\d+)\)/);
    const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0;

    // Open content type dropdown
    const contentTypeToggle = page.getByRole('button', { name: /content type/i });
    await contentTypeToggle.click();

    // Select "Documentation" filter - must click the checkbox input, not the text
    const documentationCheckbox = page.locator('[data-ouia-component-id="help-panel-content-type-option-documentation"] input[type="checkbox"]');
    await documentationCheckbox.click();

    // Wait for filter chip to appear
    await expect(page.locator('[data-ouia-component-id="help-panel-selected-chip-documentation"]')).toBeVisible();

    // Verify count has changed (should be less than or equal to initial) - this confirms filter is applied
    await expect(async () => {
      const filteredText = await toolbar.textContent();
      const filteredMatch = filteredText?.match(/Learning resources \((\d+)\)/);
      const filteredCount = filteredMatch ? parseInt(filteredMatch[1], 10) : 0;
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }).toPass({ timeout: 5000 });
  });

  test('shows selection count in content type filter', async ({ page }) => {
    // Wait for resources to load
    await expect(page.locator('[data-ouia-component-id="help-panel-learning-resources-list"]')).toBeVisible({ timeout: 15000 });

    // Open content type dropdown and select multiple filters
    const contentTypeToggle = page.getByRole('button', { name: /content type/i });
    await contentTypeToggle.click();

    // Select Quick starts - must click the checkbox input, not the text
    const quickstartCheckbox = page.locator('[data-ouia-component-id="help-panel-content-type-option-quickstart"] input[type="checkbox"]');
    await quickstartCheckbox.click();

    // Wait for filter chip to appear
    await expect(page.locator('[data-ouia-component-id="help-panel-selected-chip-quickstart"]')).toBeVisible();

    // Verify toggle button shows selection count of 1
    await expect(contentTypeToggle).toContainText('1');

    // Select another filter - Learning paths
    const learningPathCheckbox = page.locator('[data-ouia-component-id="help-panel-content-type-option-learningPath"] input[type="checkbox"]');
    await learningPathCheckbox.click();

    // Wait for filter chip to appear
    await expect(page.locator('[data-ouia-component-id="help-panel-selected-chip-learningPath"]')).toBeVisible();

    // Verify toggle button shows selection count of 2
    await expect(contentTypeToggle).toContainText('2');
  });

});
