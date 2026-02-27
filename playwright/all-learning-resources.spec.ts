import { test, expect } from '@playwright/test';
import { APP_TEST_HOST_PORT, LEARNING_RESOURCES_URL, login, extractResourceCount } from './test-utils';

test.use({ ignoreHTTPSErrors: true });

test.describe('all learning resources', async () => {

  test.beforeEach(async ({page}): Promise<void> => {

    await page.goto(`https://${APP_TEST_HOST_PORT}`, { waitUntil: 'load', timeout: 60000 });

    const loggedIn = await page.getByText('Hi,').isVisible();

    if (!loggedIn) {
      const user = process.env.E2E_USER!;
      const password = process.env.E2E_PASSWORD!;
      // make sure the SSO prompt is loaded for login
      await page.waitForLoadState("load");
      await expect(page.locator("#username-verification")).toBeVisible();
      await login(page, user, password);
      await page.waitForLoadState("load");
      await expect(page.getByText('Invalid login')).not.toBeVisible();
      // long wait for the page to load; stage can be delicate
      await page.waitForTimeout(5000);
      await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible({ timeout: 15000 });

      // conditionally accept cookie prompt
      const acceptAllButton = page.getByRole('button', { name: 'Accept all'});
      if (await acceptAllButton.isVisible()) {
        await acceptAllButton.click();
      }
    }
  });

  test('appears in the help menu and the link works', async({page}) => {
      // click the help button
      await page.getByLabel('Toggle help panel').click()
      // click the "All Learning Catalog"
      await page.getByRole('link', { name: 'All Learning Catalog' }).click();
      // Ensure page heading is "All learning resources" on the page that loads
      await page.waitForLoadState("load");
      await expect(page.locator('h1')).toHaveText('All learning resources' );
  });

  test('has the appropriate number of items on the all learning resources tab', async({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    const baseline = 98;
    const tolerancePercent = 10; // 10% tolerance
    const minExpected = Math.floor(baseline * (1 - tolerancePercent / 100));
    const maxExpected = Math.ceil(baseline * (1 + tolerancePercent / 100));

    const actualCount = await extractResourceCount(page);

    expect(actualCount, `Expected ${minExpected}-${maxExpected} items (±${tolerancePercent}% of ${baseline}), but found ${actualCount}`).toBeGreaterThanOrEqual(minExpected);
    expect(actualCount, `Expected ${minExpected}-${maxExpected} items (±${tolerancePercent}% of ${baseline}), but found ${actualCount}`).toBeLessThanOrEqual(maxExpected);
  });

  test('appears in search results', async ({page}) => {
    await page.getByRole('button', { name: 'Expandable search input toggle' }).click();
    await page.getByRole('textbox', { name: 'Search input' }).fill('all learning resources');
    await page.getByRole('textbox', { name: 'Search input' }).press('Enter');
    await expect(page.getByRole('menuitem', { name: 'All Learning Resources'}).first()).toBeVisible({timeout: 10000});
  });

  test('performs basic filtering by name', async({page}) => {
    await page.getByRole('button', { name: 'Expandable search input toggle' }).click();
    await page.getByRole('textbox', { name: 'Search input' }).fill('all learning resources');
    await page.getByRole('textbox', { name: 'Search input' }).press('Enter');
    await page.getByRole('menuitem', { name: 'All Learning Resources'}).first().click();
    await page.waitForLoadState("load");
    await page.getByRole('textbox', {name: 'Type to filter'}).fill('Adding an integration: Google');
    await expect(page.getByText('All learning resources (1)', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('filters by product family', async({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");

    await page.getByRole('checkbox', {name: 'Ansible'}).click();

    // Wait for filter to apply - count should be between 5 and 80 (filtered but not zero)
    await page.waitForFunction(() => {
      const countText = document.querySelector('.pf-v6-c-tabs__item-text')?.textContent || '';
      const match = countText.match(/\((\d+)\)/);
      const count = match ? parseInt(match[1]) : 0;
      return count >= 5 && count < 80;
    }, { timeout: 15000 });

    // Extract the actual count after filtering
    const actualCount = await extractResourceCount(page);

    // Verify we have some Ansible resources (at least 5, allowing for data changes)
    expect(actualCount, `Expected at least 5 Ansible resources, but found ${actualCount}`).toBeGreaterThanOrEqual(5);

    // all cards should have Ansible - use :visible to get only displayed cards
    const cards = await page.locator('.pf-v6-c-card:visible').all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text).toContain('Ansible');
    }
  });

  test('filters by console-wide services', async({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");
    await page.getByRole('checkbox', {name: 'Settings'}).click();

    // Wait for filter to apply - count should be between 10 and 80 (filtered but not zero)
    await page.waitForFunction(() => {
      const countText = document.querySelector('.pf-v6-c-tabs__item-text')?.textContent || '';
      const match = countText.match(/\((\d+)\)/);
      const count = match ? parseInt(match[1]) : 0;
      return count >= 10 && count < 80;
    }, { timeout: 15000 });

    // Extract the actual count after filtering
    const actualCount = await extractResourceCount(page);

    // Verify we have some Settings resources (at least 10, allowing for data changes)
    expect(actualCount, `Expected at least 10 Settings resources, but found ${actualCount}`).toBeGreaterThanOrEqual(10);

    // all cards should have Settings - use :visible to get only displayed cards
    const cards = await page.locator('.pf-v6-c-card:visible').all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text).toContain('Settings');
    }
  });

  // Note: This test is skipped because the stage environment currently has zero
  // Quick start content, causing the filter to return 0 results. The test can be
  // re-enabled when Quick start content is added to the stage environment.
  test.skip('filters by content type', async({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");

    await page.getByRole('checkbox', {name: 'Quick start'}).click();

    // Wait for filter to apply - count should be between 5 and 80 (filtered but not zero)
    await page.waitForFunction(() => {
      const countText = document.querySelector('.pf-v6-c-tabs__item-text')?.textContent || '';
      const match = countText.match(/\((\d+)\)/);
      const count = match ? parseInt(match[1]) : 0;
      return count >= 5 && count < 80;
    }, { timeout: 15000 });

    // Wait for the filter to be applied and extract the actual count
    const actualCount = await extractResourceCount(page);

    // Verify we have a reasonable number of quick starts (at least 10, allowing for data changes)
    expect(actualCount, `Expected at least 10 quick starts, but found ${actualCount}`).toBeGreaterThanOrEqual(10);

    // Wait for the DOM to stabilize by ensuring the card count matches the displayed count
    await expect(page.locator('.pf-v6-c-card:visible')).toHaveCount(actualCount, {timeout: 10000});

    const cards = await page.locator('.pf-v6-c-card:visible').all();
    expect(cards.length).toEqual(actualCount);
    for (const card of cards) {
      const cardHidden = await card.isHidden();
      if (cardHidden) {
        console.log("Somehow we located a hidden quickstart card. Card text follows:");
        console.log(await card.innerText());
      }
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByText('Quick start')).toBeVisible();
    }
  });

  test('filters by use case', async({page}) => {

    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");

    const observabilityCheckbox = page.getByRole('checkbox', {name: 'Observability'});
    await observabilityCheckbox.click();

    // Verify the checkbox is checked
    await expect(observabilityCheckbox).toBeChecked();

    // Wait for network and DOM to stabilize after the filter is applied
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    const baseline = 13;
    const tolerancePercent = 10; // 10% tolerance
    const minExpected = Math.floor(baseline * (1 - tolerancePercent / 100));
    const maxExpected = Math.ceil(baseline * (1 + tolerancePercent / 100));

    const actualCount = await extractResourceCount(page);

    expect(actualCount, `Expected ${minExpected}-${maxExpected} items (±${tolerancePercent}% of ${baseline}), but found ${actualCount}`).toBeGreaterThanOrEqual(minExpected);
    expect(actualCount, `Expected ${minExpected}-${maxExpected} items (±${tolerancePercent}% of ${baseline}), but found ${actualCount}`).toBeLessThanOrEqual(maxExpected);

    const cards = await page.locator('.pf-v6-c-card', { hasNot: page.locator('[hidden]') }).all();
    expect(cards.length).toEqual(actualCount);

    for (const card of cards) {
        await expect(card.getByText('Observability')).toBeVisible();
    }

  });

  test('displays bookmarked resources', async ({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");

    // The holy item chosen for testing
    const testItemText = "Adding a machine pool";

    // Find the card for "Adding a machine pool"
    const testCard = page.locator('.pf-v6-c-card').filter({ hasText: testItemText }).first();
    await expect(testCard).toBeVisible();

    // Check if the card is already bookmarked by looking for the unbookmark button
    const unbookmarkButton = testCard.getByRole('button', { name: 'Unbookmark learning resource' });
    const isAlreadyBookmarked = await unbookmarkButton.isVisible();

    if (!isAlreadyBookmarked) {
      // Card is not bookmarked, so bookmark it
      const bookmarkButton = testCard.getByRole('button', { name: 'Bookmark learning resource' });
      await bookmarkButton.click();
      await page.waitForLoadState("load");

      // Confirm it has been bookmarked
      await expect(testCard.getByRole('button', { name: 'Unbookmark learning resource' })).toBeVisible();
    }

    // Now check that the card appears on the "My bookmarked resources" tab
    await page.getByText('My bookmarked resources').click();
    await page.waitForLoadState("load");

    const visibleCards = await page.locator('.pf-v6-c-card').filter({visible: true}).all();
    expect(visibleCards.length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Adding a machine pool to your' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unbookmark learning resource' })).toBeVisible();
  });
});





