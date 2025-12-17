import { expect, Page } from '@playwright/test';

export async function login(page: Page, user: string, password: string): Promise<void> {
  // Fail in a friendly way if the proxy config is not set up correctly
  await expect(page.locator('text=Lockdown'), 'proxy config incorrect').toHaveCount(0);

  await disableCookiePrompt(page);

  // Wait for and fill username field
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();

  // Wait for and fill password field
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // confirm login was valid
  await expect(page.getByText('Invalid login')).not.toBeVisible();
}

// Prevents inconsistent cookie prompting that is problematic for UI testing
async function disableCookiePrompt(page: Page) {
  await page.route('**/*', async (route, request) => {
    if (request.url().includes('consent.trustarc.com') && request.resourceType() !== 'document') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
}

export async function loginWrapper(page: Page, testHostPort: string) {
  await page.goto(`https://${testHostPort}`, { waitUntil: 'load', timeout: 60000 });

  const loggedIn = await page.getByText('Hi,').isVisible();

  if (!loggedIn) {
    const user = process.env.E2E_USER!;
    const password = process.env.E2E_PASSWORD!;

    // make sure the SSO prompt is loaded for login
    await page.waitForLoadState('load');
    await expect(page.locator('#username-verification')).toBeVisible();
    await login(page, user, password);
    await page.waitForLoadState('load');
    await expect(page.getByText('Invalid login')).not.toBeVisible();
    // long wait for the page to load; stage can be delicate
    await page.waitForTimeout(5000);
    await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible();

    // conditionally accept cookie prompt
    const acceptAllButton = page.getByRole('button', { name: 'Accept all' });
    if (await acceptAllButton.isVisible()) {
      await acceptAllButton.click();
    }
  }
}