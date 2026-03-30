import { chromium, FullConfig } from '@playwright/test';
import { disableCookiePrompt, login, APP_TEST_HOST_PORT } from './test-utils';

async function globalSetup(config: FullConfig) {
  const user = process.env.E2E_USER;
  const password = process.env.E2E_PASSWORD;

  if (!user || !password) {
    throw new Error(
      'E2E_USER and E2E_PASSWORD environment variables are required for authentication.\n' +
        'Please set them before running the tests:\n' +
        'E2E_USER=your-username E2E_PASSWORD=your-password npm run playwright -- test',
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true, // Required for *.foo.redhat.com self-signed cert
  });
  const page = await context.newPage();

  console.log('🔐 Performing one-time login...');

  // Block cookie prompts
  await disableCookiePrompt(page);

  // Navigate to the application
  await page.goto(`https://${APP_TEST_HOST_PORT}`, { waitUntil: 'load', timeout: 60000 });

  // Wait for SSO login page
  await page.waitForLoadState('load');
  await page.locator('#username-verification').waitFor({ state: 'visible', timeout: 10000 });

  // Perform login
  await login(page, user, password);
  await page.waitForLoadState('load');

  // Check if we see an error page (Sentry error) indicating something went wrong
  const errorHeading = page.getByRole('heading', { name: /Something went wrong/ });
  const hasError = await errorHeading.isVisible({ timeout: 5000 }).catch(() => false);

  if (hasError) {
    console.warn('⚠️  Detected error page after login, reloading...');
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    // Wait a bit for the page to stabilize after reload
    await page.waitForTimeout(3000);
  }

  // Wait for successful login - chrome app should be visible
  await page.locator('#chrome-app-render-root').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByLabel('Settings menu').waitFor({ state: 'visible', timeout: 30000 });

  // Handle cookie consent if it appears
  const acceptAllButton = page.getByRole('button', { name: 'Accept all' });
  if (await acceptAllButton.isVisible()) {
    await acceptAllButton.click();
    await acceptAllButton.waitFor({ state: 'hidden', timeout: 5000 });
  }

  console.log('✅ Login successful, saving authentication state...');

  // Save signed-in state to 'storageState.json'
  await context.storageState({ path: 'playwright/.auth/storageState.json' });

  await browser.close();

  console.log('✅ Authentication state saved to playwright/.auth/storageState.json');
}

export default globalSetup;
