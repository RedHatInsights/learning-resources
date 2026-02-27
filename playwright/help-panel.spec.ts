import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './test-utils';

test.use({ ignoreHTTPSErrors: true });

test.describe('help panel', async () => {

  test.beforeEach(async ({page}): Promise<void> => {
    await ensureLoggedIn(page);
  });

  test('opens and displays panel title', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();
    // Check for the specific help panel title element
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();
  });

  test('closes when close button is clicked', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    const closeButton = page.locator('[data-ouia-component-id="help-panel-close-button"]');
    await closeButton.click();

    // Verify the panel is closed by checking if the panel title is no longer visible
    await expect(helpPanelTitle).not.toBeVisible();
  });

  test('displays subtabs', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Verify subtabs container is present
    const subtabs = page.locator('[data-ouia-component-id="help-panel-subtabs"]');
    await expect(subtabs).toBeVisible();
  });

  test('allows switching between subtabs', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to be open
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Click on APIs subtab
    const apiTab = page.locator('[data-ouia-component-id="help-panel-subtab-api"]');
    await apiTab.click();

    // Verify API documentation content is shown by checking for unique content in that tab
    await expect(page.getByText('No API documentation found matching your criteria.')).toBeVisible();
  });

  // Note: This test is skipped because the Ask Red Hat button requires:
  // 1. Feature flag 'platform.chrome.help-panel_direct-ask-redhat' to be enabled
  // 2. virtualAssistant remote module to load successfully
  // These may not be available in all test environments (e.g., stage)
  test.skip('displays Ask Red Hat button', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to be open
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Wait for panel content to load (it may show "Loading..." initially)
    // Check if stuck in loading state
    const loadingText = page.getByText('Loading...');
    if (await loadingText.isVisible()) {
      await expect(loadingText).not.toBeVisible({ timeout: 10000 });
    }

    const askRedHatButton = page.locator('[data-ouia-component-id="help-panel-ask-red-hat-button"]');
    await expect(askRedHatButton).toBeVisible({ timeout: 10000 });
  });

  // Note: This test is skipped because the status page link requires specific
  // feature flag combinations to be enabled:
  // - In header: both 'platform.chrome.help-panel_search' AND 'platform.chrome.help-panel_knowledge-base'
  // - In subtabs: neither of the above flags enabled
  // These conditions may not be met in all test environments (e.g., stage)
  test.skip('displays Red Hat status page link', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to be open
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Wait for panel content to load
    const loadingText = page.getByText('Loading...');
    if (await loadingText.isVisible()) {
      await expect(loadingText).not.toBeVisible({ timeout: 10000 });
    }

    // The status page link appears in either the header or subtabs depending on feature flags
    const statusPageLink = page.locator('[data-ouia-component-id="help-panel-status-page-header-button"], [data-ouia-component-id="help-panel-status-page-subtabs-button"]');
    await expect(statusPageLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('can add a new tab', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    const addTabButton = page.locator('[data-ouia-component-id="help-panel-add-tab-button"]');
    await expect(addTabButton).toBeVisible();

    await addTabButton.click();

    // Verify a new tab appears
    await expect(page.getByText('New tab')).toBeVisible();
  });
});
