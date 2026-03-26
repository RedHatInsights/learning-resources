import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { HttpResponse, http } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import APIPanel from './APIPanel';
import {
  mockApiBundles,
  mockApiSpecs,
} from '../../../user-journeys/_shared/helpPanelJourneyHelpers';

const mockApiHandlers = [
  http.get('/api/chrome-service/v1/static/api-specs-generated.json', () => {
    return HttpResponse.json(mockApiSpecs);
  }),
  http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
    return HttpResponse.json(mockApiBundles);
  }),
];

/**
 * Helper to wait for async API data to finish loading.
 * The component starts with count 0 (initial useState), so we must wait
 * for a non-zero count to confirm the MSW-mocked fetch has resolved.
 */
const waitForDataLoaded = async (canvas: ReturnType<typeof within>) => {
  await waitFor(
    () => {
      const apiItem = canvas.queryByText('Advisor API');
      expect(apiItem).toBeInTheDocument();
    },
    { timeout: 10000 }
  );
};

/**
 * Wrapper providing IntlProvider and chrome bundle overrides.
 * useChrome is mocked globally via .storybook/hooks/useChrome.tsx.
 *
 * The chrome mock is set synchronously during render (not in useEffect)
 * so child components read the correct bundle on their first render.
 */
const APIPanelWrapper = ({ bundle = 'insights' }: { bundle?: string }) => {
  /* eslint-disable rulesdir/no-chrome-api-call-from-window */
  const originalRef = React.useRef<{
    getBundleData: typeof window.insights.chrome.getBundleData;
    getAvailableBundles: typeof window.insights.chrome.getAvailableBundles;
  } | null>(null);

  if (typeof window !== 'undefined' && window.insights?.chrome) {
    if (!originalRef.current) {
      originalRef.current = {
        getBundleData: window.insights.chrome.getBundleData,
        getAvailableBundles: window.insights.chrome.getAvailableBundles,
      };
    }
    window.insights.chrome.getBundleData = () => ({ bundleId: bundle });
    window.insights.chrome.getAvailableBundles = () => [
      { id: 'insights', title: 'RHEL' },
      { id: 'ansible', title: 'Ansible' },
      { id: 'openshift', title: 'OpenShift' },
      { id: 'iam', title: 'Identity & Access Management' },
      { id: 'settings', title: 'Settings' },
    ];
  }

  React.useEffect(() => {
    return () => {
      if (originalRef.current && window.insights?.chrome) {
        window.insights.chrome.getBundleData =
          originalRef.current.getBundleData;
        window.insights.chrome.getAvailableBundles =
          originalRef.current.getAvailableBundles;
      }
    };
  }, [bundle]);
  /* eslint-enable rulesdir/no-chrome-api-call-from-window */

  return (
    <IntlProvider locale="en" defaultLocale="en">
      <div style={{ height: '600px', width: '400px' }}>
        <APIPanel setNewActionTitle={() => {}} />
      </div>
    </IntlProvider>
  );
};

const meta: Meta<typeof APIPanelWrapper> = {
  title: 'Components/Help Panel/API Panel',
  component: APIPanelWrapper,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: mockApiHandlers,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default view showing all API documentation entries
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForDataLoaded(canvas);

    const list = document.querySelector(
      '[data-ouia-component-id="help-panel-api-resources-list"]'
    );
    expect(list).toBeInTheDocument();

    await waitFor(() => {
      expect(canvas.getByText(/API Documentation \(14\)/i)).toBeInTheDocument();
    });

    expect(
      canvas.getByText(/Browse the APIs for Hybrid Cloud Console/i)
    ).toBeInTheDocument();

    const catalogLink = canvas.getByText(/API Documentation Catalog/i);
    expect(catalogLink.closest('a')).toHaveAttribute(
      'href',
      'https://developers.redhat.com/api-catalog/'
    );

    expect(canvas.getByText('Advisor API')).toBeInTheDocument();
    expect(canvas.getByText('Compliance API')).toBeInTheDocument();
  },
};

/**
 * Verify service labels render for each API doc entry
 */
export const WithServiceLabels: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForDataLoaded(canvas);

    await waitFor(() => {
      const rhelLabels = canvas.getAllByText('RHEL');
      expect(rhelLabels.length).toBeGreaterThan(0);
    });
  },
};

/**
 * Toggle between All and current bundle scope
 */
export const BundleScopeToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForDataLoaded(canvas);

    const scopeToggle = document.querySelector(
      '[data-ouia-component-id="help-panel-api-scope-toggle"]'
    );
    expect(scopeToggle).toBeInTheDocument();

    const allToggle = document.getElementById('all-toggle') as HTMLElement;
    expect(allToggle).toHaveAttribute('aria-pressed', 'true');

    const bundleToggle = document.getElementById(
      'bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
      expect(canvas.getByText(/API Documentation \(9\)/i)).toBeInTheDocument();
    });

    expect(canvas.getByText('Advisor API')).toBeInTheDocument();

    await userEvent.click(allToggle);

    await waitFor(() => {
      expect(allToggle).toHaveAttribute('aria-pressed', 'true');
      expect(canvas.getByText(/API Documentation \(14\)/i)).toBeInTheDocument();
    });
  },
};

/**
 * Pagination with 14 items (10 per page default)
 */
export const WithPagination: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForDataLoaded(canvas);

    await waitFor(() => {
      const pagination = document.querySelector(
        '[data-ouia-component-id="help-panel-api-pagination"]'
      );
      expect(pagination).toBeInTheDocument();
    });

    expect(canvas.getByText('Advisor API')).toBeInTheDocument();

    const nextButton = canvas.getByRole('button', {
      name: /go to next page/i,
    });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(canvas.getByText('Automation Analytics API')).toBeInTheDocument();
    });

    expect(canvas.queryByText('Advisor API')).not.toBeInTheDocument();

    const prevButton = canvas.getByRole('button', {
      name: /go to previous page/i,
    });
    await userEvent.click(prevButton);

    await waitFor(() => {
      expect(canvas.getByText('Advisor API')).toBeInTheDocument();
    });
  },
};

/**
 * Empty state when no API docs match the current bundle filter
 */
export const EmptyBundleFilter: Story = {
  args: {
    bundle: 'settings',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForDataLoaded(canvas);

    const bundleToggle = document.getElementById(
      'bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    await waitFor(() => {
      expect(
        canvas.getByText(/No API documentation found matching your criteria/i)
      ).toBeInTheDocument();
      expect(canvas.getByText(/API Documentation \(0\)/i)).toBeInTheDocument();
    });

    const pagination = document.querySelector(
      '[data-ouia-component-id="help-panel-api-pagination"]'
    );
    expect(pagination).not.toBeInTheDocument();
  },
};

/**
 * Empty state when the API returns no specs at all
 */
export const EmptyApiResponse: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          '/api/chrome-service/v1/static/api-specs-generated.json',
          () => {
            return HttpResponse.json([]);
          }
        ),
        http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
          return HttpResponse.json([]);
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        expect(
          canvas.getByText(/API Documentation \(0\)/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(
      canvas.getByText(/No API documentation found matching your criteria/i)
    ).toBeInTheDocument();
  },
};

/**
 * Scope toggle is hidden on the home/landing page
 */
export const HomePageNoToggle: Story = {
  args: {
    bundle: '',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForDataLoaded(canvas);

    const scopeToggle = document.querySelector(
      '[data-ouia-component-id="help-panel-api-scope-toggle"]'
    );
    expect(scopeToggle).not.toBeInTheDocument();

    await waitFor(() => {
      expect(canvas.getByText(/API Documentation \(14\)/i)).toBeInTheDocument();
    });
  },
};

/**
 * API fetch error: component gracefully shows empty state
 */
export const ApiError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          '/api/chrome-service/v1/static/api-specs-generated.json',
          () => {
            return HttpResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            );
          }
        ),
        http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        expect(
          canvas.getByText(/No API documentation found matching your criteria/i)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Deduplication: same frontendName with different spec URLs picks highest version
 */
export const DeduplicatesSpecs: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          '/api/chrome-service/v1/static/api-specs-generated.json',
          () => {
            return HttpResponse.json([
              {
                bundleLabels: ['insights'],
                frontendName: 'Notifications API',
                url: 'https://developers.redhat.com/api-catalog/api/notifications/v1',
              },
              {
                bundleLabels: ['insights'],
                frontendName: 'Notifications API',
                url: 'https://developers.redhat.com/api-catalog/api/notifications/v2',
              },
            ]);
          }
        ),
        http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
          return HttpResponse.json(mockApiBundles);
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const item = canvas.queryByText('Notifications API');
        expect(item).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    await waitFor(() => {
      expect(canvas.getByText(/API Documentation \(1\)/i)).toBeInTheDocument();
    });

    const items = canvas.getAllByText('Notifications API');
    expect(items).toHaveLength(1);
  },
};
