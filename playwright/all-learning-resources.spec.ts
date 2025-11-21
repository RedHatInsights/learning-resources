import { Page, test, expect } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });


const APP_TEST_HOST_PORT = 'stage.foo.redhat.com:1337';


async function login(page: Page, user: string, password: string): Promise<void> {
  // Fail in a friendly way if the proxy config is not set up correctly
  await expect(page.locator("text=Lockdown"), 'proxy config incorrect').toHaveCount(0)

  // dismiss the cookie prompt because it may cause issues later on
  await page.getByRole('button', { name: 'Close'}).click();

  // Wait for and fill username field
  const usernameField = page.getByLabel('Red Hat login').first();
  try {
    await usernameField.waitFor({ state: 'visible', timeout: 30000 });
  } catch (error) {
    console.error('FAILED to find username field with label "Red Hat login"');
    throw error;
  }
  await usernameField.fill(user);
  await page.getByRole('button', { name: 'Next' }).click();

  // Wait for and fill password field
  const passwordField = page.getByLabel('Password').first();
  await passwordField.waitFor({ state: 'visible', timeout: 30000 });
  await passwordField.fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // confirm login was valid
  await expect(page.getByText('Invalid login')).not.toBeVisible();
}

test.describe('all learning resources', async () => {

  test.beforeEach(async ({page}): Promise<void> => {

    await page.goto(`https://${APP_TEST_HOST_PORT}`, { waitUntil: 'load', timeout: 60000 });

    const loggedIn = await page.getByText('Hi,').isVisible();

    if (!loggedIn) {
      const user = process.env.E2E_USER || 'misconfigured';
      const password = process.env.E2E_PASSWORD || 'misconfigured';
      expect(user).not.toContain('misconfigured');
      expect(password).not.toContain('misconfigured');
      // make sure the SSO prompt is loaded for login
      await page.waitForLoadState("load");
      expect(page.locator("#username-verification")).toBeVisible();
      await login(page, user, password);
      await page.waitForLoadState("load");
      await expect(page.getByText('Invalid login')).not.toBeVisible();
      // long wait for the page to load; stage can be delicate
      await page.waitForTimeout(5000);
      await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible();
      // dismiss the damned cookie prompt again because we're obnoxiously persistent about getting permission
      await page.getByRole('button', { name: 'Accept all'}).click();
    }
  });

  test('appears in the help menu and the link works', async({page}) => {
      test.setTimeout(60000);    
      // click the help button
      await page.getByLabel('Toggle help panel').click()
      // click the "All Learning Catalog"
      await page.getByRole('link', { name: 'All Learning Catalog' }).click();
      // Ensure page heading is "All learning resources" on the page that loads
      await page.waitForLoadState("load");
      await expect(page.locator('h1')).toHaveText('All learning resources' );
  });

  test('has the appropriate number of items on the all learning resources tab', async({page}) => {
    test.setTimeout(60000);
    await page.goto(`https://${APP_TEST_HOST_PORT}/learning-resources`)
    await page.waitForLoadState("load");

    // Wait for the count to be populated (data is loaded asynchronously)
    await expect(page.getByText('All learning resources (', { exact: false })).toContainText('102', { timeout: 10000 });
  });

  test('appears in search results', async ({page}) => {
    await page.getByRole('button', { name: 'Expandable search input toggle' }).click();
    await page.getByRole('textbox', { name: 'Search input' }).fill('all learning resources');
    await page.getByRole('textbox', { name: 'Search input' }).press('Enter');
    await expect(page.getByRole('menuitem', { name: 'All Learning Resources'}).first()).toBeVisible({timeout: 10000});
  });

  test('performs basic filtering by name', async({page}) => {
    await page.getByRole('button', { name: 'Expandable search input toggle' }).click();
    await page.getByRole('textbox', { name: 'Search input' }).fill('all learning resources');
    await page.getByRole('textbox', { name: 'Search input' }).press('Enter');
    await page.getByRole('menuitem', { name: 'All Learning Resources'}).first().click();
    await page.waitForLoadState("load");
    await page.getByRole('textbox', {name: 'Type to filter'}).fill('Adding an integration: Google');
    await expect(page.getByText('All learning resources (1)', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('filters by product family', async({page}) => {
    await page.goto(`https://${APP_TEST_HOST_PORT}/learning-resources`)
    await page.waitForLoadState("load");

    await page.getByRole('checkbox', {name: 'Ansible'}).click();
    await page.waitForLoadState("load");

    await expect(page.getByText('All learning resources (11)')).toBeVisible({timeout: 10000});
    // all cards should have Ansible
    const cards = await page.locator('.lr-c-global-learning-resources-page__content--gallery-card-wrapper').all();
    for (const card of cards) {
      const text = await card.innerText();
      await expect(text).toContain('Ansible');
    }
  });

  test('filters by console-wide services', async({page}) => {
    await page.goto(`https://${APP_TEST_HOST_PORT}/learning-resources`)
    await page.waitForLoadState("load");
    await page.getByRole('checkbox', {name: 'Settings'}).click();
    await page.waitForLoadState("load");

    await expect(page.getByText('All learning resources (16)')).toBeVisible({timeout: 10000});
    // all cards should have Settings
    const cards = await page.locator('.lr-c-global-learning-resources-page__content--gallery-card-wrapper').all();
    for (const card of cards) {
      const text = await card.innerText();
      await expect(text).toContain('Settings');
    }
  });

  test.skip('filters by content type', async({page}) => {
    await page.goto(`https://${APP_TEST_HOST_PORT}/learning-resources`)
    await page.waitForLoadState("load");

    await page.getByRole('checkbox', {name: 'Quick start'}).click();
    await page.waitForLoadState("load");

    await expect(page.getByText('All learning resources (18)')).toBeVisible({timeout: 10000});
    const cards = await page.locator('.pf-v6-c-card').all();
    expect(cards.length).toEqual(18);
    for (const card of cards) {
      await expect(card.getByText('Quick start')).toBeVisible();
    }
  });

  test('filters by use case', async({page}) => {

    await page.goto(`https://${APP_TEST_HOST_PORT}/learning-resources`)
    await page.waitForLoadState("load");
    await page.getByRole('checkbox', {name: 'Observability'}).click();
    await page.waitForLoadState("load");

    await expect(page.getByText('All learning resources (13)')).toBeVisible({timeout: 10000});
    const cards = await page.locator('.pf-v6-c-card').all();
    expect(cards.length).toEqual(13);
    for (const card of cards) {
        await expect(card.getByText('Observability')).toBeVisible();
    }

  });

  test('displays bookmarked resources', async ({page}) => {
    await page.goto(`https://${APP_TEST_HOST_PORT}/learning-resources`)
    await page.waitForLoadState("load");

    // bookmark the first item
    await page.getByRole('button', { name: 'Bookmark learning resource' }).first().click();

    // now check that the "unbookmark" option is available on the bookmarked resources tab
    await page.getByText('My bookmarked resources').click();
    await page.waitForLoadState("load");
    await expect(page.getByRole('heading', { name: 'Adding a machine pool to your' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unbookmark learning resource' })).toBeVisible();
  });
});





