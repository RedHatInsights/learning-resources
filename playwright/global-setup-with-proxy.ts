/**
 * Custom global setup that properly passes proxy config to browser context
 * Based on @redhat-cloud-services/playwright-test-auth but fixes proxy support
 */
import { chromium, type FullConfig, type Page, type Route, type Request } from 'playwright';

async function disableCookiePrompt(page: Page) {
  await page.route('**/*', async (route: Route, request: Request) => {
    if (request.url().includes('consent.trustarc.com') && request.resourceType() !== 'document') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
}

async function login(page: Page, user: string, password: string) {
  // Fail in a friendly way if the proxy config is not set up correctly
  const lockdownCount = await page.locator('text=Lockdown').count();
  if (lockdownCount > 0) {
    throw new Error('Proxy config incorrect - Lockdown page detected');
  }

  // Wait for and fill username field
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();

  // Wait for and fill password field
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for navigation to console (SSO redirect)
  await page.waitForURL('https://console.stage.redhat.com/**', { timeout: 60000 });

  // Wait for the greeting to appear
  await page.getByText('Hi,').waitFor({ state: 'visible', timeout: 60000 });
}

async function globalSetup(config: FullConfig) {
  const { storageState, baseURL, proxy } = config.projects[0].use;

  // Skip setup if no storage state is configured
  if (!storageState) {
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    baseURL: baseURL as string,
    proxy: proxy, // FIX: Pass proxy config from playwright.config.ts
  });
  const page = await context.newPage();

  try {
    // Disable cookie prompts before navigation
    await disableCookiePrompt(page);

    // Navigate to the application
    await page.goto(baseURL as string || '/', { waitUntil: 'load', timeout: 60000 });

    const user = process.env.E2E_USER;
    const password = process.env.E2E_PASSWORD;

    if (!user || !password) {
      throw new Error('E2E_USER and E2E_PASSWORD environment variables must be set');
    }

    // Make sure the SSO prompt is loaded for login
    await page.waitForLoadState('load');

    // Perform login
    await login(page, user, password);

    // Save the authenticated state
    await context.storageState({ path: storageState as string });

    console.log('✅ Authentication state saved successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
