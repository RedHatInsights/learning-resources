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
      // Note: API names are now capitalized and "API" suffix is stripped (e.g., "advisor api" → "Advisor")
      const apiItem = canvas.queryByText(/Advisor/i);
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
      expect(canvas.getByText(/API Documentation \(15\)/i)).toBeInTheDocument();
    });

    expect(
      canvas.getByText(/Browse the APIs for Hybrid Cloud Console/i)
    ).toBeInTheDocument();

    const catalogLink = canvas.getByText(/API Documentation Catalog/i);
    expect(catalogLink.closest('a')).toHaveAttribute('href', '/docs/api');

    // API names are now capitalized and "API" suffix is stripped
    expect(canvas.getByText('Advisor')).toBeInTheDocument();
    expect(canvas.getByText('Compliance')).toBeInTheDocument();
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
      expect(canvas.getByText(/API Documentation \(10\)/i)).toBeInTheDocument();
    });

    // API names are capitalized and "API" suffix is stripped
    expect(canvas.getByText('Advisor')).toBeInTheDocument();

    await userEvent.click(allToggle);

    await waitFor(() => {
      expect(allToggle).toHaveAttribute('aria-pressed', 'true');
      expect(canvas.getByText(/API Documentation \(15\)/i)).toBeInTheDocument();
    });
  },
};

/**
 * Pagination with 15 items (10 per page default)
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

    // API names are capitalized and "API" suffix is stripped
    expect(canvas.getByText('Advisor')).toBeInTheDocument();

    const nextButton = canvas.getByRole('button', {
      name: /go to next page/i,
    });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(canvas.getByText('Automation Analytics')).toBeInTheDocument();
    });

    expect(canvas.queryByText('Advisor')).not.toBeInTheDocument();

    const prevButton = canvas.getByRole('button', {
      name: /go to previous page/i,
    });
    await userEvent.click(prevButton);

    await waitFor(() => {
      expect(canvas.getByText('Advisor')).toBeInTheDocument();
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
      expect(canvas.getByText(/API Documentation \(15\)/i)).toBeInTheDocument();
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
 * Test version extraction from various URL formats
 */
export const VariousVersionFormats: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          '/api/chrome-service/v1/static/api-specs-generated.json',
          () => {
            return HttpResponse.json([
              {
                bundleLabels: ['insights'],
                frontendName: 'notifications',
                url: 'https://developers.redhat.com/api-catalog/api/notifications/v1',
              },
              {
                bundleLabels: ['insights'],
                frontendName: 'notifications',
                url: 'https://developers.redhat.com/api-catalog/api/notifications/v2.0',
              },
              {
                bundleLabels: ['insights'],
                frontendName: 'sources',
                url: 'https://developers.redhat.com/api-catalog/api/sources/v3.1',
              },
              {
                bundleLabels: ['iam'],
                frontendName: 'rbac',
                url: 'https://developers.redhat.com/api-catalog/api/rbac/v1.0.0',
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
        const item = canvas.queryByText('Notifications v1');
        expect(item).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify version extraction works for different formats
    expect(canvas.getByText('Notifications v1')).toBeInTheDocument();
    expect(canvas.getByText('Notifications v2.0')).toBeInTheDocument();
    expect(canvas.getByText('Sources v3.1')).toBeInTheDocument();
    // RBAC is a known acronym and should be fully uppercased
    expect(canvas.getByText('RBAC v1.0.0')).toBeInTheDocument();
  },
};

/**
 * Test APIs without version numbers in URL
 */
export const ApisWithoutVersions: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          '/api/chrome-service/v1/static/api-specs-generated.json',
          () => {
            return HttpResponse.json([
              {
                bundleLabels: ['insights'],
                frontendName: 'advisor api',
                url: 'https://developers.redhat.com/api-catalog/api/advisor',
              },
              {
                bundleLabels: ['insights'],
                frontendName: 'compliance api',
                url: 'https://developers.redhat.com/api-catalog/api/compliance',
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
        const item = canvas.queryByText('Advisor');
        expect(item).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify capitalization works even without version numbers (and "API" suffix is stripped)
    expect(canvas.getByText('Advisor')).toBeInTheDocument();
    expect(canvas.getByText('Compliance')).toBeInTheDocument();

    // Verify no version numbers are appended when not in URL
    expect(canvas.queryByText(/Advisor v/)).not.toBeInTheDocument();
    expect(canvas.queryByText(/Compliance v/)).not.toBeInTheDocument();
  },
};

/**
 * Shows different API versions separately with version numbers in the display name.
 * Previously deduplicated to show only the highest version, now shows both v1 and v2.
 */
export const ShowsVersionsSeparately: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          '/api/chrome-service/v1/static/api-specs-generated.json',
          () => {
            return HttpResponse.json([
              {
                bundleLabels: ['insights'],
                frontendName: 'notifications api',
                url: 'https://developers.redhat.com/api-catalog/api/notifications/v1',
              },
              {
                bundleLabels: ['insights'],
                frontendName: 'notifications api',
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
        const item = canvas.queryByText('Notifications v1');
        expect(item).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Should show 2 separate entries (one for v1, one for v2)
    await waitFor(() => {
      expect(canvas.getByText(/API Documentation \(2\)/i)).toBeInTheDocument();
    });

    // Verify both versions are displayed with version numbers (without "API" suffix)
    expect(canvas.getByText('Notifications v1')).toBeInTheDocument();
    expect(canvas.getByText('Notifications v2')).toBeInTheDocument();
  },
};
