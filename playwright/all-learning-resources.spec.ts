import { Page, test, expect } from '@playwright/test';

test.use({ ignoreHTTPSErrors: true });

// Base URL for the app under test. Default uses stage.foo proxy; override for local runs or real stage:
//   E2E_BASE_URL=http://localhost:8000 npx playwright test ...
const APP_TEST_BASE_URL = process.env.E2E_BASE_URL ?? 'https://stage.foo.redhat.com:1337';
const LEARNING_RESOURCES_URL = `${APP_TEST_BASE_URL.replace(/\/$/, '')}/learning-resources`;


// Navigate to the All learning resources page. Tries the help menu first (open panel → Learn tab → "All Learning Catalog").
// If the panel does not show our app content (subtabs not visible), falls back to direct navigation so tests are reliable.
async function goToAllLearningResourcesPage(page: Page): Promise<void> {
  await page.getByLabel('Toggle help panel').click();

  const subtabs = page.locator('[data-ouia-component-id="help-panel-subtabs"]');
  try {
    await expect(subtabs).toBeVisible({ timeout: 15000 });
  } catch {
    await page.goto(LEARNING_RESOURCES_URL, { waitUntil: 'load', timeout: 60000 });
    await expect(page.getByText(/All learning resources \(\d+\)/)).toBeVisible({ timeout: 30000 });
    await page.getByLabel('Toggle help panel').click();
    return;
  }

  await page.locator('[data-ouia-component-id="help-panel-subtabs"]').getByRole('tab', { name: /learn/i }).click({ timeout: 20000 });
  await page.getByRole('link', { name: /all learning catalog/i }).click({ timeout: 30000 });
  await page.waitForLoadState('load');
  await expect(page.locator('h1')).toHaveText('All learning resources', {
    timeout: 20000,
  });
  await expect(page.getByText(/All learning resources \(\d+\)/)).toBeVisible({
    timeout: 30000,
  });
  await page.getByLabel('Toggle help panel').click();
}

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
  const countElement = page.getByText(/All learning resources \(\d+\)/).first();
  await expect(countElement).toBeVisible({ timeout: 15000 });

  const countText = await countElement.textContent();

  // Extract the number from text like "All learning resources (99)"
  const openParen = countText?.indexOf('(') ?? -1;
  const closeParen = countText?.indexOf(')') ?? -1;
  const countString = openParen >= 0 && closeParen > openParen
    ? countText?.substring(openParen + 1, closeParen).trim()
    : '0';

  const actualCount = parseInt(countString ?? '0', 10);

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

    await page.goto(APP_TEST_BASE_URL, { waitUntil: 'load', timeout: 60000 });

    const loggedIn = await page.getByText('Hi,').isVisible();

    if (!loggedIn) {
      if (!process.env.E2E_USER || !process.env.E2E_PASSWORD) {
        test.skip(true, 'E2E_USER and E2E_PASSWORD must be set when not already logged in');
      }
      const user = process.env.E2E_USER!;
      const password = process.env.E2E_PASSWORD!;
      // Wait for SSO login form (same field login() will use; longer timeout for stage)
      await page.waitForLoadState("load");
      await expect(page.getByLabel('Red Hat login').first()).toBeVisible({
        timeout: 15000,
      });
      await login(page, user, password);
      await page.waitForLoadState("load");
      await expect(page.getByText('Invalid login')).not.toBeVisible();
      await page.waitForTimeout(5000);
      await expect(page.getByRole('button', { name: 'Add widgets' }), 'dashboard not displayed').toBeVisible({ timeout: 20000 });

      // conditionally accept cookie prompt
      const acceptAllButton = page.getByRole('button', { name: 'Accept all'});
      if (await acceptAllButton.isVisible()) {
        await acceptAllButton.click();
      }
    }
  });

  test('appears in the help menu and the link works', async({page}) => {
    await page.getByLabel('Toggle help panel').click();
    await expect(page.locator('[data-ouia-component-id="help-panel-subtabs"]')).toBeVisible({ timeout: 25000 });
    await page.locator('[data-ouia-component-id="help-panel-subtabs"]').getByRole('tab', { name: /learn/i }).click({ timeout: 15000 });
    await page.getByRole('link', { name: /all learning catalog/i }).click({ timeout: 15000 });
    await page.waitForLoadState("load");
    await expect(page.locator('h1')).toHaveText('All learning resources', {
      timeout: 15000,
    });
  });

  test('has the appropriate number of items on the all learning resources tab', async({page}) => {
    await goToAllLearningResourcesPage(page);
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
    await goToAllLearningResourcesPage(page);
    await page.getByRole('textbox', { name: 'Type to filter' }).first().fill('Adding an integration: Google');
    await expect(page.getByText('All learning resources (1)', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('filters by product family', async({page}) => {
    await goToAllLearningResourcesPage(page);
    await page.getByRole('checkbox', { name: 'Ansible' }).click({ timeout: 15000 });
    await page.waitForLoadState("load");
    await expect(page.getByText(/All learning resources \(\d+\)/)).toBeVisible({ timeout: 10000 });
    const cards = await page.locator('.pf-v6-c-card', { hasNot: page.locator('[hidden]') }).all();
    for (const card of cards) {
      const text = await card.innerText();
      expect(text).toContain('Ansible');
    }
  });

  test('filters by console-wide services', async({page}) => {
    await goToAllLearningResourcesPage(page);
    await page.getByRole('checkbox', { name: 'Settings' }).click({ timeout: 15000 });
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
    await goToAllLearningResourcesPage(page);
    await page.getByRole('checkbox', { name: 'Quick start' }).click({ timeout: 15000 });

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
    await goToAllLearningResourcesPage(page);
    const observabilityCheckbox = page.getByRole('checkbox', { name: 'Observability' });
    await observabilityCheckbox.click({ timeout: 15000 });

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
    await goToAllLearningResourcesPage(page);

    // The holy item chosen for testing
    const testItemText = "Adding a machine pool";

    // Find the card for "Adding a machine pool"
    const testCard = page.locator('.pf-v6-c-card').filter({ hasText: testItemText }).first();
    await expect(testCard).toBeVisible({ timeout: 10000 });

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

  test.describe('quickstart in Help Panel', () => {
    test('opens quickstart in Help Panel as new tab when panel is closed (from All learning resources)', async ({ page }) => {
      await goToAllLearningResourcesPage(page);
      await page.getByRole('checkbox', { name: 'Quick start' }).click({ timeout: 15000 });
      await expect(page.getByText(/All learning resources \(\d+\)/)).toBeVisible({ timeout: 10000 });

      // Click the first Quick start card (e.g. "Adding a machine pool")
      const quickstartCard = page.locator('.pf-v6-c-card').filter({ hasText: 'Adding a machine pool' }).first();
      await expect(quickstartCard).toBeVisible({ timeout: 10000 });
      await quickstartCard.click();

      // Help Panel should open and show a new tab with the quickstart
      const helpTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
      await expect(helpTitle).toHaveText('Help', { timeout: 10000 });

      // Main tabs in Help Panel: should have at least 2 (Find help + new quickstart tab)
      const helpTabs = page.locator('[data-ouia-component-id="help-panel-tabs"]');
      await expect(helpTabs).toBeVisible();
      const tabList = helpTabs.locator('.pf-v6-c-tabs__list').first();
      await expect(tabList.locator('[role="tab"]')).toHaveCount(2, { timeout: 5000 });

      // Quickstart tab content: should show quickstart body (no SubTabs in this tab)
      await expect(page.getByText(/Quick start.*minutes|In this quick start/)).toBeVisible({ timeout: 10000 });
    });

    test('opens quickstart in Help Panel as new tab when panel is already open (from Learn tab)', async ({ page }) => {
      await page.getByLabel('Toggle help panel').click();
      await expect(page.locator('[data-ouia-component-id="help-panel-subtabs"]')).toBeVisible({ timeout: 30000 });

      await page.locator('[data-ouia-component-id="help-panel-subtabs"]').getByRole('tab', { name: /learn/i }).click({ timeout: 15000 });
      await expect(page.locator('[data-ouia-component-id="help-panel-learning-resources-list"]')).toBeVisible({ timeout: 15000 });

      // Click the first quickstart in the list (resource title button; name varies by environment)
      const quickstartLink = page.locator('[data-ouia-component-id="help-panel-learning-resources-list"]').getByRole('button', { name: /\w.{4,}/ }).first();
      await quickstartLink.click({ timeout: 10000 });

      // Quickstart content visible (new tab or drawer)
      await expect(page.getByText(/Quick start.*minutes|In this quick start/)).toBeVisible({ timeout: 15000 });

      const helpTabs = page.locator('[data-ouia-component-id="help-panel-tabs"]');
      await expect(helpTabs.locator('.pf-v6-c-tabs__list').first().locator('[role="tab"]')).toHaveCount(2, { timeout: 15000 });
    });
  });
});





