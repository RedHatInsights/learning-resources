import { chromium, FullConfig } from '@playwright/test';
import { ensureLoggedIn } from './test-utils';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

async function globalSetup(config: FullConfig) {
  const baseURL = config.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL || 'https://stage.foo.redhat.com:1337';

  console.log('Global setup - baseURL:', baseURL);
  console.log('Global setup - PLAYWRIGHT_BASE_URL env:', process.env.PLAYWRIGHT_BASE_URL);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Perform login once
  await ensureLoggedIn(page);

  console.log('Global setup - final URL after login:', page.url());

  // Save authentication state
  await page.context().storageState({ path: authFile });

  await browser.close();
}

export default globalSetup;
