import { Page, test, expect } from '@playwright/test';
import { loginWrapper } from './login-util';
import { APP_TEST_HOST_PORT }  from './testconfig';

test.use({ ignoreHTTPSErrors: true });

test.describe('all learning resources', async () => {

  test.beforeEach(async ({page}): Promise<void> => {
    await loginWrapper(page, APP_TEST_HOST_PORT);
  });

  test('Help panel loads and renders without Loading message', async ({page}) => {
    await page.getByRole('button', { name: 'Toggle help panel' }).click();
    await expect(page.getByText('Loading...')).not.toBeVisible();
  });

});