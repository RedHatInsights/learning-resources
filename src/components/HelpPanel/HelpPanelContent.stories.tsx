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

/**
 * Test opening and closing custom tabs
 */
export const OpenAndCloseTabs: Story = {
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

    // Find the add tab button
    const addTabButton = document.querySelector(
      '[data-ouia-component-id="help-panel-add-tab-button"]'
    ) as HTMLElement;
    expect(addTabButton).toBeInTheDocument();

    // Click to add a new tab
    await userEvent.click(addTabButton);

    // Wait for the new tab to appear
    await waitFor(
      () => {
        const newTab = canvas.getByText('New tab');
        expect(newTab).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify the tab is now active by checking for the tab content
    const newTabButton = canvas.getByRole('tab', { name: 'New tab' });
    expect(newTabButton).toHaveAttribute('aria-selected', 'true');

    // Find the close button for the new tab
    // The close button is a sibling of the tab link
    const tabItem = newTabButton.closest('.pf-v6-c-tabs__item');
    const closeButton = tabItem?.querySelector(
      '.pf-v6-c-tabs__item-action button'
    ) as HTMLElement;
    expect(closeButton).toBeInTheDocument();

    // Click the close button
    await userEvent.click(closeButton);

    // Verify the tab is removed
    await waitFor(
      () => {
        const removedTab = canvas.queryByRole('tab', { name: 'New tab' });
        expect(removedTab).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Test opening multiple tabs and verify overflow dropdown appears
 */
export const OpenMultipleTabs: Story = {
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

    // Find the add tab button
    const addTabButton = document.querySelector(
      '[data-ouia-component-id="help-panel-add-tab-button"]'
    ) as HTMLElement;

    // Keep adding tabs until overflow occurs (max 10 attempts to prevent infinite loop)
    let overflowItem = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!overflowItem && attempts < maxAttempts) {
      await userEvent.click(addTabButton);
      attempts++;

      // Wait briefly for the tab to be added
      await waitFor(
        () => {
          const tabs = canvas.queryAllByRole('tab', { name: 'New tab' });
          expect(tabs.length).toBeGreaterThanOrEqual(attempts);
        },
        { timeout: 1000 }
      ).catch(() => {
        // Ignore timeout, we'll check overflow anyway
      });

      // Check if overflow has appeared
      overflowItem = document.querySelector(
        '.pf-v6-c-tabs__item.pf-m-overflow'
      );
    }

    // Assert that overflow menu appeared
    expect(overflowItem).toBeTruthy();

    // Find and close the visible new tab(s)
    const visibleNewTabs = canvas.queryAllByRole('tab', { name: 'New tab' });

    if (visibleNewTabs.length > 0) {
      // Close the first visible new tab
      const firstTabItem = visibleNewTabs[0].closest('.pf-v6-c-tabs__item');
      const closeButton = firstTabItem?.querySelector(
        '.pf-v6-c-tabs__item-action button'
      ) as HTMLElement;

      if (closeButton) {
        await userEvent.click(closeButton);

        // Wait a bit for the tab to close
        await waitFor(
          () => {
            const tabs = canvas.queryAllByRole('tab', { name: 'New tab' });
            expect(tabs.length).toBeLessThan(visibleNewTabs.length);
          },
          { timeout: 3000 }
        );
      }
    }
  },
};

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
