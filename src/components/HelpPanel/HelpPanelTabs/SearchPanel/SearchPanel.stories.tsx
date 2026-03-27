import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';
import { IntlProvider } from 'react-intl';
import {
  AllQuickStartStates,
  QuickStartContextProvider,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { HttpResponse, http } from 'msw';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import SearchPanel from './SearchPanel';
import { getOpenQuickstartInHelpPanelStore } from '../../../../store/openQuickstartInHelpPanelStore';

const SEARCH_DEBOUNCE_MS = 600;

const testDelay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitForSearchResults = async (canvas: ReturnType<typeof within>) => {
  await canvas.findByRole(
    'list',
    { name: /search results/i },
    { timeout: 15000 }
  );
};

/**
 * Wrapper component to provide required context providers.
 * Chrome is globally mocked in Storybook preview.
 */
const SearchPanelWrapper = ({ bundle = 'insights' }: { bundle?: string }) => {
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  const quickStartContextValue = useValuesForQuickStartContext({
    allQuickStarts: [],
    activeQuickStartID: '',
    setActiveQuickStartID: () => {},
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: setQuickStartStates,
    useQueryParams: false,
  });

  React.useEffect(() => {
    /* eslint-disable rulesdir/no-chrome-api-call-from-window */
    if (typeof window !== 'undefined' && window.insights?.chrome) {
      const originalGetBundleData = window.insights.chrome.getBundleData;
      window.insights.chrome.getBundleData = () => ({ bundleId: bundle });
      return () => {
        window.insights.chrome.getBundleData = originalGetBundleData;
      };
    }
    /* eslint-enable rulesdir/no-chrome-api-call-from-window */
  }, [bundle]);

  return (
    <IntlProvider locale="en" defaultLocale="en">
      <QuickStartContextProvider value={quickStartContextValue}>
        <div style={{ height: '600px', width: '400px' }}>
          <SearchPanel setNewActionTitle={() => {}} />
        </div>
      </QuickStartContextProvider>
    </IntlProvider>
  );
};

const mockSearchPanelHandlers = [
  http.get('/api/quickstarts/v1/quickstarts/filters', () => {
    return HttpResponse.json({
      data: {
        categories: [
          {
            categoryId: 'product-families',
            categoryName: 'Product families',
            categoryData: [
              {
                group: 'Product families',
                data: [
                  { id: 'insights', filterLabel: 'RHEL', cardLabel: 'RHEL' },
                  {
                    id: 'ansible',
                    filterLabel: 'Ansible',
                    cardLabel: 'Ansible',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  }),
  http.get('/api/quickstarts/v1/quickstarts', ({ request }) => {
    const url = new URL(request.url);
    const displayName = url.searchParams.get('display-name') || '';
    const allResources = [
      {
        content: {
          metadata: {
            name: 'insights-getting-started',
            tags: [{ kind: 'bundle', value: 'insights' }],
            favorite: false,
          },
          spec: {
            displayName: 'Getting started with Red Hat Insights',
            description: 'Learn the basics of Red Hat Insights',
            type: { text: 'Quick start' },
            link: {
              href: 'https://console.redhat.com/insights/getting-started',
            },
          },
        },
      },
      {
        content: {
          metadata: {
            name: 'insights-docs',
            tags: [{ kind: 'bundle', value: 'insights' }],
            externalDocumentation: true,
            favorite: false,
          },
          spec: {
            displayName: 'Red Hat Insights Documentation',
            description: 'Complete documentation for Red Hat Insights',
            type: { text: 'Documentation' },
            link: {
              href: 'https://access.redhat.com/documentation/en-us/red_hat_insights',
            },
          },
        },
      },
      {
        content: {
          metadata: {
            name: 'advisor-quickstart',
            tags: [{ kind: 'bundle', value: 'insights' }],
            favorite: true,
          },
          spec: {
            displayName: 'Advisor Quick Start',
            description: 'Get started with Red Hat Advisor',
            type: { text: 'Quick start' },
            link: { href: 'https://console.redhat.com/insights/advisor' },
          },
        },
      },
      {
        content: {
          metadata: {
            name: 'ansible-getting-started',
            tags: [{ kind: 'bundle', value: 'ansible' }],
            favorite: false,
          },
          spec: {
            displayName: 'Getting Started with Ansible',
            description: 'Introduction to Ansible Automation Platform',
            type: { text: 'Quick start' },
            link: {
              href: 'https://console.redhat.com/ansible/getting-started',
            },
          },
        },
      },
    ];

    if (displayName) {
      const query = displayName.toLowerCase();
      const filtered = allResources.filter((r) =>
        r.content.spec.displayName.toLowerCase().includes(query)
      );
      return HttpResponse.json({ data: filtered });
    }
    return HttpResponse.json({ data: allResources });
  }),
  http.get('/api/chrome-service/v1/static/api-specs-generated.json', () => {
    return HttpResponse.json([
      {
        bundleLabels: ['insights'],
        frontendName: 'Advisor API',
        url: 'https://developers.redhat.com/api-catalog/api/advisor',
      },
    ]);
  }),
  http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
    return HttpResponse.json([
      {
        id: 'insights',
        title: 'Red Hat Insights',
        navItems: [
          {
            appId: 'advisor',
            filterable: true,
            href: '/insights/advisor',
            id: 'advisor',
            title: 'Advisor',
          },
        ],
      },
    ]);
  }),
  http.get('/api/chrome-service/v1/user', () => {
    return HttpResponse.json({
      data: {
        favoritePages: [{ pathname: '/insights/advisor', favorite: true }],
      },
    });
  }),
  http.post('/api/chrome-service/v1/favorite-pages', async ({ request }) => {
    const body = (await request.json()) as {
      pathname: string;
      favorite: boolean;
    };
    return HttpResponse.json([
      { pathname: body.pathname, favorite: body.favorite },
    ]);
  }),
  http.get('/api/quickstarts/v1/favorites', () => {
    return HttpResponse.json({
      data: [{ quickstartName: 'advisor-quickstart', favorite: true }],
    });
  }),
  http.post('/api/quickstarts/v1/favorites', async () => {
    return HttpResponse.json({ success: true });
  }),
];

const meta: Meta<typeof SearchPanelWrapper> = {
  title: 'Components/Help Panel/Search Panel',
  component: SearchPanelWrapper,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: mockSearchPanelHandlers,
    },
  },
  tags: ['autodocs'],
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
 * Default view showing the search input, recent queries, and recommended content.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const searchInput = canvas.getByPlaceholderText(
          'Search for topics, products, use cases, etc.'
        );
        expect(searchInput).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    await canvas.findByText('Recommended content');
    await canvas.findByText('No recent searches');
  },
};

/**
 * Search for a query and see results.
 */
export const SearchWithResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Insights');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);
    await canvas.findByText(
      'Getting started with Red Hat Insights',
      {},
      { timeout: 5000 }
    );
    await canvas.findByText('Search results');
  },
};

/**
 * Quick start search results use the shared store (Help Panel tab), not `window.open`.
 */
export const ClickQuickStartSearchResultNotifiesHelpPanelStore: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    getOpenQuickstartInHelpPanelStore().updateState('CONSUMED_OPEN');

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Getting started');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);
    await canvas.findByText(
      'Getting started with Red Hat Insights',
      {},
      { timeout: 5000 }
    );

    const titleButton = await canvas.findByRole('button', {
      name: /Getting started with Red Hat Insights/i,
    });
    await userEvent.click(titleButton);

    await waitFor(() => {
      const { pendingOpen } = getOpenQuickstartInHelpPanelStore().getState();
      expect(pendingOpen?.quickstartId).toBe('insights-getting-started');
    });
  },
};

/**
 * Documentation search results open in a new tab via `window.open`.
 */
export const ClickDocumentationSearchResultOpensNewWindow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openSpy = spyOn(window, 'open').mockImplementation(() => null);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Red Hat Insights Documentation');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);
    await canvas.findByText(
      'Red Hat Insights Documentation',
      {},
      { timeout: 5000 }
    );

    const titleButton = await canvas.findByRole('button', {
      name: /Red Hat Insights Documentation/i,
    });
    await userEvent.click(titleButton);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
    });
    expect(openSpy.mock.calls[0][1]).toBe('_blank');
    expect(openSpy.mock.calls[0][2]).toBe('noopener,noreferrer');

    openSpy.mockRestore();
  },
};

/**
 * Search for a query that yields no results.
 */
export const SearchNoResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'xyznonexistent');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitFor(
      () => {
        expect(canvas.getByText('No results found')).toBeInTheDocument();
      },
      { timeout: 15000 }
    );
  },
};

/**
 * Filter search results by content type (Documentation).
 */
export const FilterByContentType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Insights');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);

    const filterToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(filterToggle);

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

    await canvas.findByText(
      'Red Hat Insights Documentation',
      {},
      { timeout: 5000 }
    );
  },
};

/**
 * Clear all filters after applying one.
 */
export const ClearAllFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Insights');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);

    const filterToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(filterToggle);

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
    await testDelay(300);

    const clearButton = await canvas.findByRole('button', {
      name: /clear all filters/i,
    });
    await userEvent.click(clearButton);

    await canvas.findByText(
      'Getting started with Red Hat Insights',
      {},
      { timeout: 5000 }
    );
  },
};

/**
 * Clear the search input to return to default view.
 */
export const ClearSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Insights');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);

    const resetButton = await canvas.findByRole('button', { name: /reset/i });
    await userEvent.click(resetButton);
    await testDelay(300);

    await canvas.findByText('Recommended content');
  },
};

/**
 * Recent queries display and re-execution.
 */
export const RecentQueries: Story = {
  beforeEach: () => {
    localStorage.setItem(
      'help-panel-recent-queries',
      JSON.stringify([{ query: 'Ansible', resultCount: 4 }])
    );
    return () => {
      localStorage.removeItem('help-panel-recent-queries');
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        expect(canvas.getByText('Ansible')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const queryButton = await canvas.findByRole('button', { name: 'Ansible' });
    await userEvent.click(queryButton);
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);
    await canvas.findByText(
      'Getting Started with Ansible',
      {},
      { timeout: 5000 }
    );
  },
};

/**
 * Clear search history.
 */
export const ClearSearchHistory: Story = {
  beforeEach: () => {
    localStorage.setItem(
      'help-panel-recent-queries',
      JSON.stringify([{ query: 'test query', resultCount: 2 }])
    );
    return () => {
      localStorage.removeItem('help-panel-recent-queries');
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('test query');

    const clearButton = await canvas.findByRole('button', {
      name: /clear search history/i,
    });
    await userEvent.click(clearButton);
    await testDelay(300);

    await canvas.findByText('No recent searches');
    expect(localStorage.getItem('help-panel-recent-queries')).toBeNull();
  },
};

/**
 * Recommended content scope toggle (All vs bundle).
 */
export const RecommendedContentToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Recommended content');

    const allToggle = await canvas.findByRole('button', { name: /^all$/i });
    await userEvent.click(allToggle);
    await testDelay(300);

    await waitFor(() => {
      expect(allToggle).toHaveAttribute('aria-pressed', 'true');
    });

    await canvas.findByRole('list', { name: /recommended content/i });
  },
};

/**
 * Search scope toggle (All vs current bundle) in results view.
 */
export const SearchScopeToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = await canvas.findByPlaceholderText(
      'Search for topics, products, use cases, etc.'
    );
    await userEvent.type(searchInput, 'Getting started');
    await testDelay(SEARCH_DEBOUNCE_MS);

    await waitForSearchResults(canvas);

    await waitFor(() => {
      const toggle = canvasElement.querySelector('#search-bundle-toggle');
      expect(toggle).toBeInTheDocument();
    });

    const bundleToggle = canvasElement.querySelector(
      '#search-bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);
    await testDelay(300);

    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });
  },
};
