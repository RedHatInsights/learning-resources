import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';
import { IntlProvider } from 'react-intl';
import {
  AllQuickStartStates,
  QuickStartContextProvider,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { HttpResponse, http } from 'msw';
import { expect, userEvent, within } from 'storybook/test';
import SearchPanel from './SearchPanel';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockQuickstartsResponse = {
  data: [
    {
      content: {
        metadata: {
          name: 'insights-qs-1',
          tags: [{ kind: 'bundle', value: 'insights' }],
        },
        spec: {
          displayName: 'Getting Started with Insights',
          description: 'Learn the basics of Red Hat Insights',
          type: { text: 'Quick start' },
          link: { href: '#' },
        },
      },
    },
    {
      content: {
        metadata: {
          name: 'insights-doc-1',
          tags: [{ kind: 'bundle', value: 'insights' }],
          externalDocumentation: true,
        },
        spec: {
          displayName: 'Insights Documentation',
          description: 'Complete documentation for Red Hat Insights',
          type: { text: 'Documentation' },
          link: { href: 'https://example.com/insights-docs' },
        },
      },
    },
    {
      content: {
        metadata: {
          name: 'ansible-qs-1',
          tags: [{ kind: 'bundle', value: 'ansible' }],
        },
        spec: {
          displayName: 'Ansible Quick Start',
          description: 'Getting started with Ansible Automation Platform',
          type: { text: 'Quick start' },
          link: { href: '#' },
        },
      },
    },
    {
      content: {
        metadata: {
          name: 'ansible-doc-1',
          tags: [{ kind: 'bundle', value: 'ansible' }],
          externalDocumentation: true,
        },
        spec: {
          displayName: 'Ansible Documentation',
          description: 'Complete Ansible Automation Platform docs',
          type: { text: 'Documentation' },
          link: { href: 'https://example.com/ansible-docs' },
        },
      },
    },
    {
      content: {
        metadata: {
          name: 'openshift-qs-1',
          tags: [{ kind: 'bundle', value: 'openshift' }],
        },
        spec: {
          displayName: 'OpenShift Quick Start',
          description: 'Getting started with OpenShift clusters',
          type: { text: 'Quick start' },
          link: { href: '#' },
        },
      },
    },
    {
      content: {
        metadata: {
          name: 'insights-tasks-conversion',
          tags: [{ kind: 'bundle', value: 'insights' }],
        },
        spec: {
          displayName: 'Convert CentOS to RHEL',
          description: 'Convert CentOS Linux systems to RHEL using Insights',
          type: { text: 'Quick start' },
          link: { href: '#' },
        },
      },
    },
  ],
};

const mockFiltersResponse = {
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
              { id: 'ansible', filterLabel: 'Ansible', cardLabel: 'Ansible' },
            ],
          },
        ],
      },
    ],
  },
};

const mockFavoritesResponse = {
  data: [{ quickstartName: 'insights-qs-1', favorite: true }],
};

const mockBundleInfoResponse = [
  {
    bundleLabels: ['insights'],
    frontendName: 'Vulnerability',
    url: 'https://developers.redhat.com/api-catalog/api/vulnerability',
  },
  {
    bundleLabels: ['ansible'],
    frontendName: 'Automation Hub',
    url: 'https://developers.redhat.com/api-catalog/api/automation-hub',
  },
];

const mockBundlesResponse = [
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
      {
        appId: 'vulnerability',
        filterable: true,
        href: '/insights/vulnerability',
        id: 'vulnerability',
        title: 'Vulnerability',
      },
    ],
  },
  {
    id: 'ansible',
    title: 'Ansible Automation Platform',
    navItems: [
      {
        appId: 'automation-hub',
        filterable: true,
        href: '/ansible/automation-hub',
        id: 'automation-hub',
        title: 'Automation Hub',
      },
    ],
  },
];

const mockUserResponse = {
  data: {
    favoritePages: [{ pathname: '/insights/advisor', favorite: true }],
  },
};

// ---------------------------------------------------------------------------
// MSW handlers
// ---------------------------------------------------------------------------

const searchPanelMswHandlers = [
  http.get('/api/quickstarts/v1/quickstarts/filters', () =>
    HttpResponse.json(mockFiltersResponse)
  ),
  http.get('/api/quickstarts/v1/quickstarts', () =>
    HttpResponse.json(mockQuickstartsResponse)
  ),
  http.get('/api/quickstarts/v1/favorites', () =>
    HttpResponse.json(mockFavoritesResponse)
  ),
  http.post('/api/quickstarts/v1/favorites', () =>
    HttpResponse.json({ success: true })
  ),
  http.get('/api/chrome-service/v1/static/api-specs-generated.json', () =>
    HttpResponse.json(mockBundleInfoResponse)
  ),
  http.get('/api/chrome-service/v1/static/bundles-generated.json', () =>
    HttpResponse.json(mockBundlesResponse)
  ),
  http.get('/api/chrome-service/v1/user', () =>
    HttpResponse.json(mockUserResponse)
  ),
  http.post('/api/chrome-service/v1/favorite-pages', async ({ request }) => {
    const body = (await request.json()) as {
      pathname: string;
      favorite: boolean;
    };
    return HttpResponse.json([
      { pathname: body.pathname, favorite: body.favorite },
    ]);
  }),
];

// ---------------------------------------------------------------------------
// Wrapper component
// ---------------------------------------------------------------------------

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

  /* eslint-disable rulesdir/no-chrome-api-call-from-window */
  if (typeof window !== 'undefined' && window.insights?.chrome) {
    window.insights.chrome.getBundleData = () => ({ bundleId: bundle });
  }
  /* eslint-enable rulesdir/no-chrome-api-call-from-window */

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEARCH_DEBOUNCE_MS = 600;
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const waitForSearchResults = async (
  canvas: ReturnType<typeof within>,
  timeout = 15000
) => {
  await canvas.findByRole('list', { name: /search results/i }, { timeout });
};

const waitForEmptyState = async (
  canvas: ReturnType<typeof within>,
  timeout = 15000
) => {
  await canvas.findByText('No results found', {}, { timeout });
};

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
  await waitForSearchResults(canvas);
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof SearchPanelWrapper> = {
  title: 'Components/Help Panel/Search Panel',
  component: SearchPanelWrapper,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: searchPanelMswHandlers,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Default state with empty search. Shows the "No recent searches" message
 * and recommended content section.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    localStorage.removeItem('help-panel-recent-queries');

    await canvas.findByText('No recent searches');
    await canvas.findByText('Recommended content');
    await canvas.findByText('Recent search queries');
  },
};

/**
 * When recent search history exists in localStorage, the queries are shown
 * with their result counts.
 */
export const WithRecentSearchHistory: Story = {
  beforeEach: () => {
    localStorage.setItem(
      'help-panel-recent-queries',
      JSON.stringify([
        { query: 'insights advisor', resultCount: 5 },
        { query: 'openshift clusters', resultCount: 3 },
      ])
    );
    return () => {
      localStorage.removeItem('help-panel-recent-queries');
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('insights advisor');
    await canvas.findByText('openshift clusters');
    await canvas.findByText('5 results');
    await canvas.findByText('3 results');
  },
};

/**
 * Typing a search query triggers a debounced search. Results matching the
 * query appear in a data list.
 */
export const SearchWithResults: Story = {
  play: async ({ canvasElement }) => {
    localStorage.removeItem('help-panel-recent-queries');
    const canvas = within(canvasElement);

    await searchAndWaitForResults(canvas, 'Insights');

    await canvas.findByText(
      'Getting Started with Insights',
      {},
      { timeout: 5000 }
    );
    await canvas.findByText('Search results');

    localStorage.removeItem('help-panel-recent-queries');
  },
};

/**
 * When the search query does not match any resources, the empty state with
 * "No results found" is displayed.
 */
export const SearchNoResults: Story = {
  play: async ({ canvasElement }) => {
    localStorage.removeItem('help-panel-recent-queries');
    const canvas = within(canvasElement);

    await typeSearchQuery(canvas, 'zzzznonexistentzzz');
    await delay(SEARCH_DEBOUNCE_MS);
    await waitForEmptyState(canvas);

    localStorage.removeItem('help-panel-recent-queries');
  },
};

/**
 * On the home page (no bundle context), the recommended content section does
 * not show a bundle toggle since there's no bundle to filter by.
 */
export const HomePageNoToggle: Story = {
  args: {
    bundle: 'landing',
  },
  play: async ({ canvasElement }) => {
    localStorage.removeItem('help-panel-recent-queries');
    const canvas = within(canvasElement);

    await canvas.findByText('Recommended content');

    expect(
      canvas.queryByRole('button', { name: /^all$/i })
    ).not.toBeInTheDocument();
  },
};
