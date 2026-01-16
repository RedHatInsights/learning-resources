import { Page, test, expect } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

// This can be changed to hit stage directly, but by default devs should be using stage.foo
const APP_TEST_HOST_PORT = 'stage.foo.redhat.com:1337';
const LEARNING_RESOURCES_URL = `https://${APP_TEST_HOST_PORT}/learning-resources`;


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

// Extracts the count from "All learning resources (N)" text
async function extractResourceCount(page: Page): Promise<number> {
  // Wait for the element to contain a number in parentheses (not just the loading state)
  // Use .first() to handle cases where multiple elements match (e.g., tab and overflow menu)
  const countElement = page.locator('.pf-v6-c-tabs__item-text', { hasText: 'All learning resources' }).first();
  await expect(countElement).toContainText(/All learning resources \(\d+\)/, { timeout: 10000 });

  const countText = await countElement.textContent();

  // Extract the number from text like "All learning resources (99)"
  const openParen = countText?.indexOf('(') ?? -1;
  const closeParen = countText?.indexOf(')') ?? -1;
  const countString = openParen >= 0 && closeParen > openParen
    ? countText?.substring(openParen + 1, closeParen).trim()
    : '0';

  const actualCount = parseInt(countString, 10);

  if (isNaN(actualCount)) {
    throw new Error(`Failed to extract valid count from text: "${countText}". Extracted string was: "${countString}"`);
  }

  return actualCount;
}

async function login(page: Page, user: string, password: string): Promise<void> {
  // Fail in a friendly way if the proxy config is not set up correctly
  await expect(page.locator("text=Lockdown"), 'proxy config incorrect').toHaveCount(0)

  await disableCookiePrompt(page)

  // Wait for and fill username field
  await page.getByLabel('Red Hat login').first().fill(user);
  await page.getByRole('button', { name: 'Next' }).click();

  // Wait for and fill password field
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  // confirm login was valid
  await expect(page.getByText('Invalid login')).not.toBeVisible();
}

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
      await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible();

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
    await page.waitForLoadState("load");

    await expect(page.getByText('All learning resources (11)')).toBeVisible({timeout: 10000});
    // all cards should have Ansible
    const cards = await page.locator('.pf-v6-c-card', { hasNot: page.locator('[hidden]') }).all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text).toContain('Ansible');
    }
  });

  test('filters by console-wide services', async({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");
    await page.getByRole('checkbox', {name: 'Settings'}).click();
    await page.waitForLoadState("load");

    await expect(page.getByText('All learning resources (16)')).toBeVisible({timeout: 10000});
    // all cards should have Settings
    const cards = await page.locator('.pf-v6-c-card', { hasNot: page.locator('[hidden]') }).all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text).toContain('Settings');
    }
  });

  test('filters by content type', async({page}) => {
    await page.goto(LEARNING_RESOURCES_URL);
    await page.waitForLoadState("load");

    await page.getByRole('checkbox', {name: 'Quick start'}).click();

    // Wait for the filter to be applied by waiting for the count to update
    const expectedMatches = 18;
    await expect(page.getByText(`All learning resources (${expectedMatches})`)).toBeVisible({timeout: 10000});

    // Wait for the DOM to stabilize by ensuring the card count matches the expected count
    await expect(page.locator('.pf-v6-c-card:visible')).toHaveCount(expectedMatches, {timeout: 10000});

    const cards = await page.locator('.pf-v6-c-card:visible').all();
    expect(cards.length).toEqual(expectedMatches);
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





