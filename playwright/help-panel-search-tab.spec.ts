import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from './test-utils';

const SEARCH_DEBOUNCE_MS = 600;

test.describe('help panel - Search tab', () => {
  test.beforeEach(async ({ page }): Promise<void> => {
    // Block trustarc cookie prompts
    await disableCookiePrompt(page);

    // Navigate to dashboard - authentication state is already loaded from global setup
    await page.goto('/', { waitUntil: 'load', timeout: 60000 });

    // Tier 1: Wait for chrome header to be fully loaded
    await expect(page.getByText('Hi,')).toBeVisible();

    // Open help panel
    await page.getByLabel('Toggle help panel').click();
    const helpPanelTitle = page.locator('[data-ouia-component-id="help-panel-title"]');
    await expect(helpPanelTitle).toBeVisible();

    // Check if Search tab is available (behind feature flag platform.chrome.help-panel_search)
    const searchTab = page.locator('[data-ouia-component-id="help-panel-tab-search"]');
    const searchTabCount = await searchTab.count();

    if (searchTabCount === 0) {
      test.skip(true, 'Search tab not available (feature flag platform.chrome.help-panel_search disabled)');
      return;
    }

    // Navigate to Search subtab
    await searchTab.click();
    await expect(page.locator('[data-ouia-component-id="help-panel-search-root"]')).toBeVisible();

    // Clear any existing search history for consistent tests
    await page.evaluate(() => localStorage.removeItem('help-panel-recent-queries'));
  });

  test('displays recommended content by default', async ({ page }) => {
    // Wait for recommended content section to load
    const recommendedToggle = page.locator('[data-ouia-component-id="help-panel-recommended-scope-toggle"]');

    // Verify "Recommended content" heading is visible
    await expect(page.getByRole('heading', { name: /recommended content/i })).toBeVisible({ timeout: 10000 });

    // Verify at least one recommended item is displayed (if toggle is visible, we're on a bundle page)
    const isToggleVisible = await recommendedToggle.isVisible();

    if (isToggleVisible) {
      // On bundle page - recommended content should load based on bundle or fallback
      const recommendedItems = page.locator('[aria-label="Recommended content"] .pf-v6-c-data-list__item');
      await expect(recommendedItems.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('executes search against API', async ({ page }) => {
    // Type search query
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('Insights');

    // Verify search results appear (implicitly waits for debounce and API call)
    const searchResults = page.getByRole('list', { name: /search results/i });
    await expect(searchResults).toBeVisible({ timeout: 15000 });

    // Verify at least one result is displayed
    const resultItems = searchResults.locator('.pf-v6-c-data-list__item');
    await expect(resultItems.first()).toBeVisible();
  });

  test('filters search results by content type', async ({ page }) => {
    // Perform search
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('Red Hat');

    // Wait for results (implicitly waits for debounce and API call)
    const searchResults = page.getByRole('list', { name: /search results/i });
    await expect(searchResults).toBeVisible({ timeout: 15000 });

    // Open content type filter dropdown
    const filterToggle = page.getByRole('button', { name: /content type/i });
    await filterToggle.click();

    // Select "Documentation" filter
    const docOption = page.locator('[data-ouia-component-id="help-panel-search-filter-option-documentation"]');
    await expect(docOption).toBeVisible();
    await docOption.click();

    // Close dropdown
    await filterToggle.click();

    // Verify filter chip appears (Label with "Documentation" text)
    await expect(page.locator('.pf-v6-c-label').filter({ hasText: 'Documentation' })).toBeVisible();

    // Results should be filtered (verify list still exists and has items)
    await expect(searchResults).toBeVisible();
  });

  test('clears all filters', async ({ page }) => {
    // Perform search
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('Console');

    // Wait for results (implicitly waits for debounce and API call)
    await expect(page.getByRole('list', { name: /search results/i })).toBeVisible({ timeout: 15000 });

    // Apply filter
    const filterToggle = page.getByRole('button', { name: /content type/i });
    await filterToggle.click();
    const quickstartOption = page.locator('[data-ouia-component-id="help-panel-search-filter-option-quickstart"]');
    await quickstartOption.click();
    await filterToggle.click();

    // Verify filter chip appears (Label with "Quick starts" text)
    await expect(page.locator('.pf-v6-c-label').filter({ hasText: 'Quick starts' })).toBeVisible();

    // Click "Clear all filters"
    const clearButton = page.getByRole('button', { name: /clear all filters/i });
    await clearButton.click();

    // Verify filter chip is removed
    await expect(page.locator('.pf-v6-c-label').filter({ hasText: 'Quick starts' })).not.toBeVisible();
  });

  test('saves and displays recent search queries', async ({ page }) => {
    // Perform first search
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('Ansible');

    // Wait for results (implicitly waits for debounce and API call)
    await expect(page.getByRole('list', { name: /search results/i })).toBeVisible({ timeout: 15000 });

    // Clear search
    const clearButton = page.getByLabel('Reset');
    await clearButton.click();

    // Verify recent search appears
    await expect(page.getByRole('heading', { name: /recent search/i })).toBeVisible();

    // The recent query should appear as a clickable button
    const recentQueryList = page.getByRole('list', { name: /recent search queries/i });
    await expect(recentQueryList).toBeVisible();

    // Recent queries are rendered as link buttons with the query text
    const ansibleQuery = recentQueryList.getByRole('button', { name: 'Ansible' });
    await expect(ansibleQuery).toBeVisible();
  });

  test('re-executes search from recent queries', async ({ page }) => {
    // Perform search to populate recent queries
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('OpenShift');
    await expect(page.getByRole('list', { name: /search results/i })).toBeVisible({ timeout: 15000 });

    // Clear search
    const clearButton = page.getByLabel('Reset');
    await clearButton.click();

    // Wait for recent queries to appear
    const recentQueryList = page.getByRole('list', { name: /recent search queries/i });
    await expect(recentQueryList).toBeVisible();

    // Click on recent query (link button with query text)
    const openShiftQuery = recentQueryList.getByRole('button', { name: 'OpenShift' });
    await expect(openShiftQuery).toBeVisible();
    await openShiftQuery.click();

    // Verify search input is populated
    await expect(searchInput).toHaveValue('OpenShift');

    // Verify search results appear again (implicitly waits for debounce and API call)
    await expect(page.getByRole('list', { name: /search results/i })).toBeVisible({ timeout: 15000 });
  });

  test('clears search history', async ({ page }) => {
    // Perform search to populate recent queries
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('RHEL');
    await expect(page.getByRole('list', { name: /search results/i })).toBeVisible({ timeout: 15000 });

    // Clear search
    const clearButton = page.getByLabel('Reset');
    await clearButton.click();

    // Verify recent query exists
    const recentQueryList = page.getByRole('list', { name: /recent search queries/i });
    await expect(recentQueryList).toBeVisible();
    const rhelQuery = recentQueryList.getByRole('button', { name: 'RHEL' });
    await expect(rhelQuery).toBeVisible();

    // Click "Clear search history" (link button with aria-label)
    const clearHistoryButton = page.getByRole('button', { name: /clear search history/i });
    await clearHistoryButton.click();

    // Verify "No recent searches" message appears
    await expect(page.getByText(/no recent searches/i)).toBeVisible();
  });

  test('displays multiple result types in search', async ({ page }) => {
    // Search for a common term that should return multiple types
    const searchInput = page.getByPlaceholder(/Search for topics, products, use cases/i);
    await searchInput.fill('Red Hat');

    // Wait for results (implicitly waits for debounce and API call)
    const searchResults = page.getByRole('list', { name: /search results/i });
    await expect(searchResults).toBeVisible({ timeout: 15000 });

    // Results should contain a mix of services, documentation, quickstarts, etc.
    const resultItems = searchResults.locator('.pf-v6-c-data-list__item');
    const count = await resultItems.count();

    // Should have multiple results
    expect(count).toBeGreaterThan(0);

    // Check if we have different types (by looking for different badges/labels)
    // This is informational - actual types depend on search results
    const labels = searchResults.locator('.pf-v6-c-label, .pf-v6-c-badge');
    const labelCount = await labels.count();

    // Verify result type indicators are present
    expect(labelCount).toBeGreaterThan(0);
  });
});
