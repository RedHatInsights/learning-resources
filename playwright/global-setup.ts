import { chromium, FullConfig } from '@playwright/test';
import { disableCookiePrompt, login } from './test-utils';

async function globalSetup(config: FullConfig) {
  const { storageState, baseURL } = config.projects[0].use;

  // Skip setup if no storage state is configured
  if (!storageState) {
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    // Navigate to the application
    await page.goto(baseURL || '/', { waitUntil: 'load', timeout: 60000 });

    const user = process.env.E2E_USER!;
    const password = process.env.E2E_PASSWORD!;

    if (!user || !password) {
      throw new Error('E2E_USER and E2E_PASSWORD environment variables must be set');
    }

    // Make sure the SSO prompt is loaded for login
    await page.waitForLoadState('load');

    // Perform login
    await disableCookiePrompt(page);
    await login(page, user, password);
    await page.waitForLoadState('load');

    // Verify successful login
    await page.getByRole('button', { name: 'Add widgets' }).waitFor({ state: 'visible', timeout: 30000 });

    // Accept cookie prompt if visible
    const acceptAllButton = page.getByRole('button', { name: 'Accept all' });
    if (await acceptAllButton.isVisible().catch(() => false)) {
      await acceptAllButton.click();
    }

    // Save the authenticated state
    await context.storageState({ path: storageState as string });

    console.log('Authentication state saved successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
