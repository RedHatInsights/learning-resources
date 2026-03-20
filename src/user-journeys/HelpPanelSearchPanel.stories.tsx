import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { HttpResponse, http } from 'msw';
import { AppEntryWithRouter } from './_shared/components/AppEntryWithRouter';
import {
  navigateToTab,
  openHelpPanel,
  searchPanelJourneyMswHandlers,
  waitForPageLoad,
} from './_shared/helpPanelJourneyHelpers';
import { TEST_TIMEOUTS, delay } from './_shared/testConstants';

/**
 * User Journey: Help Panel - Search Panel
 *
 * Tests the complete user workflow for searching, filtering, and interacting
 * with search results in the help panel.
 */

const SEARCH_DEBOUNCE_MS = 600;

const typeSearchQuery = async (
  canvas: ReturnType<typeof within>,
  query: string
) => {
  const searchInput = await canvas.findByPlaceholderText(
    'Search for topics, products, use cases, etc.'
  );
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, query);
};

const searchAndWaitForResults = async (
  canvas: ReturnType<typeof within>,
  query: string
) => {
  await typeSearchQuery(canvas, query);
  await delay(SEARCH_DEBOUNCE_MS);
  await canvas.findByRole(
    'list',
    { name: /search results/i },
    { timeout: 15000 }
  );
};

const meta: Meta<typeof AppEntryWithRouter> = {
  title: 'User Journeys/Help Panel/Search Panel',
  component: AppEntryWithRouter,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: searchPanelJourneyMswHandlers,
    },
    docs: {
      description: {
        component: `
# Help Panel - Search Panel User Journey

Tests the search and discovery workflow including:
- Searching for resources and viewing results
- Filtering search results by content type
- Clearing filters and search input
- Recent query history and re-running queries
- Toggling recommended content scope
- Favoriting services and bookmarking resources
- Switching search scope between All and current bundle
        `,
      },
    },
  },
  args: {
    initialRoute: '/',
    bundle: 'insights',
  },
  beforeEach: () => {
    localStorage.removeItem('help-panel-recent-queries');
    return () => {
      localStorage.removeItem('help-panel-recent-queries');
    };
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Manual Testing Entry Point
 */
export const ManualTesting: Story = {};

/**
 * 01 / Page Loads
 */
export const Step01_PageLoads: Story = {
  name: '01 / Page Loads',
  play: async ({ canvasElement }) => {
    await waitForPageLoad(canvasElement);
  },
};

/**
 * 02 / Open Help Panel
 */
export const Step02_OpenHelpPanel: Story = {
  name: '02 / Open Help Panel',
  play: async ({ canvasElement }) => {
    await openHelpPanel(canvasElement);
  },
};

/**
 * 03 / Navigate to Search Tab
 */
export const Step03_NavigateToSearchTab: Story = {
  name: '03 / Navigate to Search Tab',
  play: async ({ canvasElement }) => {
    await navigateToTab(canvasElement, 'Search');
    console.log('UJ: ✅ Search tab opened');
  },
};

/**
 * 04 / Search and View Results
 *
 * Typing a search query triggers a debounced search. Results matching the
 * query appear in a data list.
 */
export const Step04_SearchAndViewResults: Story = {
  name: '04 / Search and View Results',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Insights');

    await canvas.findByText(
      'Getting started with Red Hat Insights',
      {},
      { timeout: 5000 }
    );
    await canvas.findByText('Search results');

    console.log('UJ: ✅ Search returned results');
  },
};

/**
 * 05 / Search and Filter by Content Type
 *
 * After searching, the filter dropdown becomes visible. Selecting a content
 * type filter narrows the results.
 */
export const Step05_SearchAndFilterByType: Story = {
  name: '05 / Search and Filter by Type',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Insights');

    const filterToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(filterToggle);
    await delay(TEST_TIMEOUTS.AFTER_MENU_OPEN);

    // PF6 Select renders the dropdown in a portal outside the Storybook canvas.
    // Use OUIA component IDs to locate the option (same pattern as LearnPanel stories).
    await waitFor(() => {
      const option = document.querySelector(
        '[data-ouia-component-id="help-panel-search-filter-option-documentation"]'
      );
      expect(option).toBeInTheDocument();
    });
    const docCheckbox = document.querySelector(
      '[data-ouia-component-id="help-panel-search-filter-option-documentation"] input[type="checkbox"]'
    );
    if (!docCheckbox) throw new Error('Documentation checkbox not found');
    await userEvent.click(docCheckbox as HTMLElement);

    await userEvent.click(filterToggle);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await canvas.findByText(
      'Red Hat Insights Documentation',
      {},
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Filtered results by content type');
  },
};

/**
 * 06 / Clear All Filters
 *
 * After applying a filter, clicking "Clear all filters" removes the chips
 * and restores the full result set.
 */
export const Step06_ClearAllFilters: Story = {
  name: '06 / Clear All Filters',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Insights');

    const filterToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(filterToggle);
    await delay(TEST_TIMEOUTS.AFTER_MENU_OPEN);

    await waitFor(() => {
      const option = document.querySelector(
        '[data-ouia-component-id="help-panel-search-filter-option-services"]'
      );
      expect(option).toBeInTheDocument();
    });
    const servicesCheckbox = document.querySelector(
      '[data-ouia-component-id="help-panel-search-filter-option-services"] input[type="checkbox"]'
    );
    if (!servicesCheckbox) throw new Error('Services checkbox not found');
    await userEvent.click(servicesCheckbox as HTMLElement);

    await userEvent.click(filterToggle);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    const clearButton = await canvas.findByRole('button', {
      name: /clear all filters/i,
    });
    await userEvent.click(clearButton);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await canvas.findByText(
      'Getting started with Red Hat Insights',
      {},
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Cleared all filters');
  },
};

/**
 * 07 / Clear Search
 *
 * Clicking the X on the search input clears the query and returns to the
 * default view with recommended content.
 */
export const Step07_ClearSearch: Story = {
  name: '07 / Clear Search',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Insights');

    const resetButton = await canvas.findByRole('button', { name: /reset/i });
    await userEvent.click(resetButton);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await canvas.findByText('Recommended content');

    console.log('UJ: ✅ Cleared search and returned to default');
  },
};

/**
 * 08 / Click Recent Query
 *
 * Clicking a recent search query fills the search input and triggers a new
 * search with that query text.
 */
export const Step08_ClickRecentQuery: Story = {
  name: '08 / Click Recent Query',
  play: async ({ canvasElement }) => {
    localStorage.setItem(
      'help-panel-recent-queries',
      JSON.stringify([{ query: 'Ansible', resultCount: 4 }])
    );

    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    const queryButton = await canvas.findByRole('button', { name: 'Ansible' });
    await userEvent.click(queryButton);

    await delay(SEARCH_DEBOUNCE_MS);
    await canvas.findByRole(
      'list',
      { name: /search results/i },
      { timeout: 8000 }
    );

    await canvas.findByText(
      'Getting Started with Ansible',
      {},
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Clicked recent query and got results');
  },
};

/**
 * 09 / Clear Search History
 *
 * Clicking "Clear search history" removes all recent queries and shows the
 * "No recent searches" message.
 */
export const Step09_ClearSearchHistory: Story = {
  name: '09 / Clear Search History',
  play: async ({ canvasElement }) => {
    localStorage.setItem(
      'help-panel-recent-queries',
      JSON.stringify([{ query: 'test query', resultCount: 2 }])
    );

    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await canvas.findByText('test query');

    const clearButton = await canvas.findByRole('button', {
      name: /clear search history/i,
    });
    await userEvent.click(clearButton);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await canvas.findByText('No recent searches');
    expect(localStorage.getItem('help-panel-recent-queries')).toBeNull();

    console.log('UJ: ✅ Cleared search history');
  },
};

/**
 * 10 / Recommended Content Toggle
 *
 * Recommended content shows the bundle-specific vs "All" toggle when inside
 * a known bundle. Switching toggles changes the displayed content.
 */
export const Step10_RecommendedContentToggle: Story = {
  name: '10 / Recommended Content Toggle',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await canvas.findByText('Recommended content');

    const allToggle = await canvas.findByRole('button', { name: /^all$/i });
    await userEvent.click(allToggle);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await waitFor(() => {
      expect(allToggle).toHaveAttribute('aria-pressed', 'true');
    });

    await canvas.findByRole('list', { name: /recommended content/i });

    console.log('UJ: ✅ Toggled recommended content scope');
  },
};

/**
 * 11 / Toggle Favorite Service
 *
 * Service search results show a favorite star. Clicking it toggles the
 * favorite state and fires the favorite-pages API.
 */
const favoritePagesSpy = fn();

export const Step11_ToggleFavoriteService: Story = {
  name: '11 / Toggle Favorite Service',
  parameters: {
    msw: {
      handlers: [
        ...searchPanelJourneyMswHandlers.filter(
          (h) =>
            !(
              h.info.method === 'POST' &&
              h.info.path === '/api/chrome-service/v1/favorite-pages'
            )
        ),
        http.post(
          '/api/chrome-service/v1/favorite-pages',
          async ({ request }) => {
            const body = (await request.json()) as {
              pathname: string;
              favorite: boolean;
            };
            favoritePagesSpy(body);
            return HttpResponse.json([
              { pathname: body.pathname, favorite: body.favorite },
            ]);
          }
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    favoritePagesSpy.mockClear();
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Advisor');

    const unfavoriteBtn = await canvas.findByRole(
      'button',
      { name: /unfavorite advisor/i },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );
    await userEvent.click(unfavoriteBtn);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await canvas.findByRole(
      'button',
      { name: /favorite advisor/i },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    await waitFor(() => {
      expect(favoritePagesSpy).toHaveBeenCalledWith({
        pathname: '/insights/advisor',
        favorite: false,
      });
    });

    console.log('UJ: ✅ Toggled service favorite');
  },
};

/**
 * 12 / Toggle Bookmark Resource
 *
 * Learning resource results show a bookmark icon. Clicking it toggles the
 * bookmark state and fires the favorites API.
 */
const bookmarkSpy = fn();

export const Step12_ToggleBookmarkResource: Story = {
  name: '12 / Toggle Bookmark Resource',
  parameters: {
    msw: {
      handlers: [
        ...searchPanelJourneyMswHandlers.filter(
          (h) =>
            !(
              h.info.path === '/api/quickstarts/v1/favorites' &&
              (h.info.method === 'POST' || h.info.method === 'GET')
            )
        ),
        http.get('/api/quickstarts/v1/favorites', () => {
          return HttpResponse.json({
            data: [{ quickstartName: 'advisor-quickstart', favorite: true }],
          });
        }),
        http.post('/api/quickstarts/v1/favorites', async ({ request }) => {
          const body = (await request.json()) as {
            quickstartName: string;
            favorite: boolean;
          };
          bookmarkSpy(body);
          return HttpResponse.json({ success: true });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    bookmarkSpy.mockClear();
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Advisor Quick Start');

    await canvas.findByRole('list', { name: /search results/i });
    await canvas.findByRole(
      'button',
      { name: 'Advisor Quick Start' },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    const unbookmarkBtn = await canvas.findByRole(
      'button',
      { name: /unbookmark learning resource/i },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );
    await userEvent.click(unbookmarkBtn);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await canvas.findByRole(
      'button',
      { name: /bookmark learning resource/i },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    await waitFor(() => {
      expect(bookmarkSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quickstartName: 'advisor-quickstart',
          favorite: false,
        })
      );
    });

    console.log('UJ: ✅ Toggled resource bookmark');
  },
};

/**
 * 13 / Search Scope Toggle
 *
 * After performing a search, the search scope toggle (All vs bundle name)
 * allows narrowing results to the current bundle.
 */
export const Step13_SearchScopeToggle: Story = {
  name: '13 / Search Scope Toggle',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Search');
    await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

    await searchAndWaitForResults(canvas, 'Getting started');

    await waitFor(() => {
      const toggle = canvasElement.querySelector('#search-bundle-toggle');
      expect(toggle).toBeInTheDocument();
    });
    const bundleToggle = canvasElement.querySelector(
      '#search-bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });

    await canvas.findByText(
      'Getting started with Red Hat Insights',
      {},
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Toggled search scope to current bundle');
  },
};
