import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import {
  AllQuickStartStates,
  QuickStartContextProvider,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { HttpResponse, http } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MockConsolePage } from '../../user-journeys/_shared/components/MockConsolePage';

/**
 * Wrapper component that provides required context providers
 */
const HelpPanelWrapper = ({ bundle = 'insights' }: { bundle?: string }) => {
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

  return (
    <IntlProvider locale="en" defaultLocale="en">
      <QuickStartContextProvider value={quickStartContextValue}>
        <MemoryRouter initialEntries={['/']}>
          <MockConsolePage bundle={bundle} />
        </MemoryRouter>
      </QuickStartContextProvider>
    </IntlProvider>
  );
};

/**
 * MSW handlers for mocking APIs
 */
const mockHelpPanelHandlers = [
  // Mock quickstarts filters API
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
                ],
              },
            ],
          },
          {
            categoryId: 'content',
            categoryName: 'Content type',
            categoryData: [
              {
                group: 'Content type',
                data: [
                  {
                    id: 'documentation',
                    filterLabel: 'Documentation',
                    cardLabel: 'Documentation',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  }),
  // Mock quickstarts API
  http.get('/api/quickstarts/v1/quickstarts', () => {
    return HttpResponse.json({
      data: [
        {
          content: {
            metadata: {
              name: 'test-quickstart',
              tags: [{ kind: 'bundle', value: 'insights' }],
            },
            spec: {
              displayName: 'Test Quick Start',
              description: 'A test quick start',
              type: { text: 'Quick start' },
              link: { href: '#' },
            },
          },
        },
      ],
    });
  }),
  // Mock favorites API
  http.get('/api/quickstarts/v1/favorites', () => {
    return HttpResponse.json({ data: [] });
  }),
  // Mock user identity (favorite pages) - needed when search flag is enabled
  http.get('/api/chrome-service/v1/user', () => {
    return HttpResponse.json({
      data: { favoritePages: [] },
    });
  }),
  http.get('/api/chrome-service/v1/static/api-specs-generated.json', () => {
    return HttpResponse.json([]);
  }),
  http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
    return HttpResponse.json([]);
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
  http.post('/api/quickstarts/v1/favorites', async () => {
    return HttpResponse.json({ success: true });
  }),
  // Support cases API (empty state) - prevents "Failed to fetch" errors
  http.post('https://api.access.redhat.com/support/v1/cases/filter', () =>
    HttpResponse.json({ cases: [] })
  ),
  http.post('https://api.access.stage.redhat.com/support/v1/cases/filter', () =>
    HttpResponse.json({ cases: [] })
  ),
];

const meta: Meta<typeof HelpPanelWrapper> = {
  title: 'Components/Help Panel/Help Panel Content',
  component: HelpPanelWrapper,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: mockHelpPanelHandlers,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default view of the Help Panel
 */
export const Default: Story = {};

/**
 * Verify the status page link appears in the header
 */
export const StatusPageLink: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for page to load and find the Help button in the header
    const helpButton = await canvas.findByLabelText(
      'Toggle help panel',
      {},
      { timeout: 5000 }
    );
    expect(helpButton).toBeInTheDocument();

    // Click the Help button to open the panel
    await userEvent.click(helpButton);

    // Wait for the help panel drawer to open
    await waitFor(
      () => {
        const drawer = document.querySelector('.pf-v6-c-drawer.pf-m-expanded');
        expect(drawer).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Wait for the help panel title to be visible
    await waitFor(
      () => {
        const helpPanelTitle = document.querySelector(
          '[data-ouia-component-id="help-panel-title"]'
        );
        expect(helpPanelTitle).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Wait for and verify the status page link is visible
    await waitFor(
      () => {
        const statusPageLink = document.querySelector('.lr-c-status-page-link');
        expect(statusPageLink).toBeInTheDocument();

        // Verify the link text
        expect(statusPageLink).toHaveTextContent('Red Hat status page');

        // Verify the link href
        expect(statusPageLink).toHaveAttribute(
          'href',
          'https://status.redhat.com/'
        );

        // Verify it opens in a new tab
        expect(statusPageLink).toHaveAttribute('target', '_blank');
      },
      { timeout: 5000 }
    );
  },
};

// Story removed: Add/close tab functionality no longer exists in single-tier tab structure

// Story removed: Tab overflow functionality testing no longer relevant with static tabs

/**
 * Test that the drawer close button works
 */
export const CloseDrawer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for page to load and find the Help button in the header
    const helpButton = await canvas.findByLabelText(
      'Toggle help panel',
      {},
      { timeout: 5000 }
    );
    expect(helpButton).toBeInTheDocument();

    // Click the Help button to open the panel
    await userEvent.click(helpButton);

    // Wait for the help panel drawer to open
    await waitFor(
      () => {
        const drawer = document.querySelector('.pf-v6-c-drawer.pf-m-expanded');
        expect(drawer).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Wait for the help panel to be visible
    await waitFor(
      () => {
        const helpPanelTitle = document.querySelector(
          '[data-ouia-component-id="help-panel-title"]'
        );
        expect(helpPanelTitle).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Find the close button using data-ouia-component-id
    const closeButton = document.querySelector(
      '[data-ouia-component-id="help-panel-close-button"]'
    ) as HTMLElement;
    expect(closeButton).toBeInTheDocument();

    // Click the close button
    await userEvent.click(closeButton);

    // Verify the drawer panel is no longer visible
    // The drawer should collapse, so the help panel content should not be visible
    await waitFor(
      () => {
        const drawer = document.querySelector('.pf-v6-c-drawer.pf-m-expanded');
        expect(drawer).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};
