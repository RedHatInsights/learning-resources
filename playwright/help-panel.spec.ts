import { test, expect } from '@playwright/test';
import { APP_TEST_HOST_PORT, login } from './test-utils';

test.use({ ignoreHTTPSErrors: true });

test.describe('help panel', async () => {

  test.beforeEach(async ({page}): Promise<void> => {

    await page.goto(`https://${APP_TEST_HOST_PORT}`, { waitUntil: 'load', timeout: 60000 });

    const loggedIn = await page.getByText('Hi,').isVisible();

    if (!loggedIn) {
      const user = process.env.E2E_USER!;
      const password = process.env.E2E_PASSWORD!;
      // make sure the SSO prompt is loaded for login
      await page.waitForLoadState("load");
      await expect(page.locator("#username-verification")).toBeVisible();
      await login(page, user, password);
      await page.waitForLoadState("load");
      await expect(page.getByText('Invalid login')).not.toBeVisible();
      // long wait for the page to load; stage can be delicate
      await page.waitForTimeout(5000);
      await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible();

      // conditionally accept cookie prompt
      const acceptAllButton = page.getByRole('button', { name: 'Accept all'});
      if (await acceptAllButton.isVisible()) {
        await acceptAllButton.click();
      }
    }
  });

  test('opens and displays panel title', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();
    await expect(page.getByText('Help', { exact: true }).first()).toBeVisible();
  });

  test('closes when close button is clicked', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();
    await expect(page.getByText('Help', { exact: true }).first()).toBeVisible();

    const closeButton = page.locator('[data-ouia-component-id="help-panel-close-button"]');
    await closeButton.click();

    // Verify the panel is closed by checking if the title is no longer visible
    await expect(page.getByText('Help', { exact: true }).first()).not.toBeVisible();
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
    await expect(page.getByText('Help', { exact: true }).first()).toBeVisible();

    // Click on APIs subtab
    const apiTab = page.locator('[data-ouia-component-id="help-panel-subtab-api"]');
    await apiTab.click();

    // Verify API documentation content is shown
    await expect(page.getByText('API documentation')).toBeVisible();
  });

  test('displays Ask Red Hat button', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    const askRedHatButton = page.locator('[data-ouia-component-id="help-panel-ask-red-hat-button"]');
    await expect(askRedHatButton).toBeVisible();
  });

  test('displays Red Hat status page link', async ({page}) => {
    await page.getByLabel('Toggle help panel').click();

    // The status page link appears in either the header or subtabs depending on feature flags
    const statusPageLink = page.locator('[data-ouia-component-id="help-panel-status-page-header-button"], [data-ouia-component-id="help-panel-status-page-subtabs-button"]');
    await expect(statusPageLink.first()).toBeVisible();
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
