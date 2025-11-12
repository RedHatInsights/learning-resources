import { Page, test, expect } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

async function login(page: Page, user: string, password: string): Promise<void> {
  // Fail in a friendly way if the proxy config is not set up correctly
  await expect(page.locator("text=Lockdown"), 'proxy config incorrect').toHaveCount(0)
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  // confirm login was valid
  await expect(page.getByText('Invalid login')).not.toBeVisible();
}

test.describe('all learning resources', async () => {

  test.beforeEach(async ({page}): Promise<void> => {
    await page.goto('https://stage.foo.redhat.com:1337');
    const user = process.env.E2E_USER || 'misconfigured';
    const password = process.env.E2E_PASSWORD || 'misconfigured';
    expect(user).not.toContain('misconfigured');
    expect(password).not.toContain('misconfigured');
    // make sure the SSO prompt is loaded for login
    await page.waitForLoadState("load");
    await login(page, user, password);
    await page.waitForLoadState("load");
    await expect(page.getByText('Invalid login')).not.toBeVisible();
    // long wait for the page to load; stage can be delicate
    await page.waitForTimeout(10000);
    await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible();
  });

  test('Validate developer change to title of Learn tab', async({page}) => {
    test.setTimeout(60000);
    // click the help button
    await page.getByLabel('Toggle help panel').click()
    await page.waitForTimeout(5000);

    // The Learn tab should be visible with the updated text, 'Learn (Test)'
    await expect(page.getByText('LEARN (Test)')).toBeVisible();
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
});





