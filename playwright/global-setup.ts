import { chromium, FullConfig } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const user = process.env.E2E_USER!;
  const password = process.env.E2E_PASSWORD!;

  // Log external IP address to help diagnose IP-based blocking
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('External IP address:', data.ip);
  } catch (error) {
    console.log('Could not determine external IP:', error);
  }

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
  const storageState = await page.context().storageState({ path: 'playwright/.auth/user.json' });

  // Debug: log cookie domains
  console.log('Saved cookies for domains:', storageState.cookies.map(c => c.domain).join(', '));
  console.log('Current URL after auth:', page.url());

  await browser.close();

  // Verify file was written
  const fs = require('fs');
  const path = require('path');
  const authFile = path.resolve('playwright/.auth/user.json');
  if (fs.existsSync(authFile)) {
    const stats = fs.statSync(authFile);
    console.log(`Auth file written successfully: ${authFile} (${stats.size} bytes)`);
  } else {
    console.error(`WARNING: Auth file not found at ${authFile}`);
  }

  console.log('Global setup complete');
}

export default globalSetup;
