import { Page, test, expect } from '@playwright/test';


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
    await page.goto('https://console.stage.redhat.com');
    const user = process.env.E2E_USER || 'misconfigured';
    const password = process.env.E2E_PASSWORD || 'misconfigured';
    await login(page, user, password);
    await page.waitForLoadState("load");
  });

  test('appears in the help menu and the link works', async({page}) => {
    await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible();
  });
});





