import { Page, test } from '@playwright/test';

async function login(page: Page, user: string, password: string): Promise<void> {
  // Fail in a friendly way if the proxy config is not set up correctly
  expect(page.locator("text=Lockdown")).to_have_count(0)
  await page.getByLabel('Red Hat login').fill(user);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}


test('appears in the help menu and the link works', async({page}) => {
    await page.goto('https://console.stage.redhat.com');
    const user = process.env.TEST_USER || 'test';
    const password = process.env.TEST_PASSWORD || 'test';
    await login(page, user, password);
    expect(page.getByRole('button', {name: 'Add widgets'})).toBeVisible();
});
