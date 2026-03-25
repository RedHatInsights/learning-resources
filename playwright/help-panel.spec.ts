import { test, expect } from "@chromatic-com/playwright";
import { disableCookiePrompt, setupConsoleListeners, blockProblematicEndpoints } from './test-utils';

test.describe('help panel', async () => {

  test.beforeEach(async ({page}): Promise<void> => {
    // Set up console listeners to capture browser errors
    setupConsoleListeners(page);

    // Block problematic API endpoints that return 403 in CI
    await blockProblematicEndpoints(page);

    // Block cookie consent dialogs (auth handled by global setup)
    await disableCookiePrompt(page);

    // Navigate to dashboard (auth state from global setup is automatically applied)
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

    // Wait for dashboard to be ready
    await page.getByLabel('Toggle help panel').waitFor({ state: 'visible', timeout: 15000 });
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

  test('displays status page link in header', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // Wait for help panel to be open
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // The status page link is always visible in the header next to the Help title
    const statusPageLink = page.locator('.lr-c-status-page-link');
    await expect(statusPageLink).toBeVisible();
    await expect(statusPageLink).toHaveText('Red Hat status page');
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
