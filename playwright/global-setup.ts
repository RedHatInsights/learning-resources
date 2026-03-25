import { chromium, FullConfig } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const user = process.env.E2E_USER!;
  const password = process.env.E2E_PASSWORD!;

  console.log('Performing global authentication setup...');

  const browser = await chromium.launch();
  const page = await browser.newPage({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  // Set up cookie prompt blocking before navigation
  await disableCookiePrompt(page);

  // Navigate and login
  await page.goto('/', { waitUntil: 'load', timeout: 60000 });

  // Perform login
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for dashboard to appear
  await page.getByRole('button', { name: 'Add widgets' }).waitFor({ state: 'visible', timeout: 30000 });

  // Wait for chrome to fully load
  await page.getByLabel('Toggle help panel').waitFor({ state: 'visible', timeout: 15000 });

  console.log('Authentication successful, saving storage state...');

  // Save signed-in state
  await page.context().storageState({ path: 'playwright/.auth/user.json' });

  await browser.close();

  console.log('Global setup complete');
}

export default globalSetup;
