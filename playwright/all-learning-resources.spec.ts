import { test, expect } from "@chromatic-com/playwright";
import { disableCookiePrompt, extractResourceCount, waitForCountInRange, navigateToLearningResources } from './test-utils';

test.describe('all learning resources', async () => {

  test.beforeEach(async ({page, context}): Promise<void> => {
    // Debug: Check if cookies are loaded
    const cookies = await context.cookies();
    console.log(`Test has ${cookies.length} cookies for domains:`, cookies.map(c => c.domain).join(', '));

    // Block cookie consent dialogs (auth handled by global setup)
    await disableCookiePrompt(page);

    // Navigate to dashboard (auth state from global setup is automatically applied)
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });
    console.log('After navigation, URL is:', page.url());

    // Wait for dashboard to be ready
    await page.getByLabel('Toggle help panel').waitFor({ state: 'visible', timeout: 15000 });
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
    // Navigate via UI instead of page.goto to avoid redirect issues
    await navigateToLearningResources(page);

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
    // Backend (with or without fuzzy) may return 1 to many results; wait for count to stabilize in range
    await waitForCountInRange(page, 1, 100, 25000);
  });

  test('filters by product family', async({page}) => {
    await navigateToLearningResources(page);

    await page.getByRole('checkbox', {name: 'Ansible'}).click();

    // Wait for network and DOM to stabilize after the filter is applied
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    // Wait for filter to apply - count should drop from ~98 to filtered range (5-79)
    const actualCount = await waitForCountInRange(page, 5, 79, 20000);

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
    await navigateToLearningResources(page);
    await page.getByRole('checkbox', {name: 'Settings'}).click();
    await expect (page.getByRole('checkbox', { name: 'Settings'})).toBeChecked();

    // Wait for network and DOM to stabilize after the filter is applied
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    // Wait for filter to apply - count should drop from ~98 to filtered range (10-79)
    const actualCount = await waitForCountInRange(page, 10, 79, 20000);

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
    await navigateToLearningResources(page);

    await page.getByRole('checkbox', {name: 'Quick start'}).click();

    // Wait for filter to apply - count should drop from ~98 to filtered range (10-79)
    const actualCount = await waitForCountInRange(page, 10, 79, 20000);

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
    await navigateToLearningResources(page);

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

    const cards = await page.locator('.pf-v6-c-card:visible').all();
    expect(cards.length).toEqual(actualCount);

    for (const card of cards) {
        await expect(card.getByText('Observability')).toBeVisible();
    }

  });

  test('displays bookmarked resources', async ({page}) => {
    await navigateToLearningResources(page);

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
    await expect(page.getByRole('button', { name: 'Unbookmark learning resource' }).first()).toBeVisible();
  });
});
