import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';
import { IntlProvider } from 'react-intl';
import {
  AllQuickStartStates,
  QuickStartContextProvider,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import KBPanel from './KBPanel';
import { mockKBArticles } from '../../../user-journeys/_shared/helpPanelJourneyHelpers';

/**
 * Helper function to wait for component loading to complete
 */
const waitForLoadingComplete = async (canvas: ReturnType<typeof within>) => {
  // Wait for search input to be present (always rendered)
  await waitFor(
    () => {
      const searchInput = canvas.queryByPlaceholderText(
        /search knowledgebase articles/i
      );
      expect(searchInput).toBeInTheDocument();
    },
    { timeout: 5000 }
  );

  // Wait for the article count to appear (indicates data is loaded)
  await waitFor(
    () => {
      const articleCount = canvas.queryByText(
        /Knowledgebase articles \(\d+\)/i
      );
      expect(articleCount).toBeInTheDocument();
    },
    { timeout: 5000 }
  );
};

/**
 * Helper function to verify visible titles exist or don't exist
 */
const expectVisibleTitles = async (
  canvas: ReturnType<typeof within>,
  expectedTitles: string[],
  notExpectedTitles?: string[]
) => {
  await waitFor(() => {
    expectedTitles.forEach((title) => {
      const element = canvas.queryByText(title, { exact: false });
      expect(element).toBeInTheDocument();
    });

    if (notExpectedTitles) {
      notExpectedTitles.forEach((title) => {
        const element = canvas.queryByText(title, { exact: false });
        expect(element).not.toBeInTheDocument();
      });
    }
  });
};

/**
 * Wrapper component to provide required context providers
 */
const KBPanelWrapper = ({ bundle = 'insights' }: { bundle?: string }) => {
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

  // Update window.insights.chrome to return the correct bundle
  React.useEffect(() => {
    /* eslint-disable rulesdir/no-chrome-api-call-from-window */
    if (typeof window !== 'undefined' && window.insights?.chrome) {
      const originalGetBundleData = window.insights.chrome.getBundleData;
      const originalGetAvailableBundles =
        window.insights.chrome.getAvailableBundles;

      window.insights.chrome.getBundleData = () => ({ bundleId: bundle });
      window.insights.chrome.getAvailableBundles = () => [
        { id: 'insights', title: 'RHEL' },
        { id: 'ansible', title: 'Ansible' },
        { id: 'openshift', title: 'OpenShift' },
        { id: 'iam', title: 'Identity & Access Management' },
        { id: 'settings', title: 'Settings' },
        { id: 'subscriptions-services', title: 'Subscriptions' },
      ];

      return () => {
        window.insights.chrome.getBundleData = originalGetBundleData;
        window.insights.chrome.getAvailableBundles =
          originalGetAvailableBundles;
      };
    }
    /* eslint-enable rulesdir/no-chrome-api-call-from-window */
  }, [bundle]);

  return (
    <IntlProvider locale="en" defaultLocale="en">
      <QuickStartContextProvider value={quickStartContextValue}>
        <div style={{ height: '600px', width: '400px' }}>
          <KBPanel setNewActionTitle={() => {}} mockArticles={mockKBArticles} />
        </div>
      </QuickStartContextProvider>
    </IntlProvider>
  );
};

const meta: Meta<typeof KBPanelWrapper> = {
  title: 'Components/Help Panel/Knowledgebase Panel',
  component: KBPanelWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default view of the Knowledgebase Panel showing all articles
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify KB articles list is visible
    const articlesList = document.querySelector(
      '[data-ouia-component-id="help-panel-kb-articles-list"]'
    );
    const dataList = articlesList?.querySelector('[role="list"]');
    expect(dataList).toBeInTheDocument();

    // Verify search input is present
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    expect(searchInput).toBeInTheDocument();

    // Verify description and Customer Portal link
    expect(
      canvas.getByText(/Find knowledgebase articles/i)
    ).toBeInTheDocument();
    expect(canvas.getByText(/Customer Portal/i)).toBeInTheDocument();

    // Verify article count shows all mock articles (15 total)
    expect(
      canvas.getByText(/Knowledgebase articles \(15\)/i)
    ).toBeInTheDocument();

    // Verify some article titles are present from mock data
    await waitFor(() => {
      const articles = canvas.queryAllByRole('link', {
        name: /System Information|Simple Content/i,
      });
      expect(articles.length).toBeGreaterThan(0);
    });
  },
};

/**
 * Test search functionality
 */
export const SearchArticles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Get search input and type
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    await userEvent.type(searchInput, 'Authentication');

    // Wait for search results to filter
    await waitFor(() => {
      const count = canvas.queryByText(/Knowledgebase articles \(3\)/i);
      expect(count).toBeInTheDocument();
    });

    // Verify Authentication articles are shown
    await expectVisibleTitles(
      canvas,
      [
        'How to switch from Basic Auth to Certificate Authentication',
        'OpenShift Cluster Authentication and Authorization',
      ],
      ['Simple Content Access']
    );
  },
};

/**
 * Test search with no results
 */
export const SearchNoResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Get search input and type something that won't match
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    await userEvent.type(searchInput, 'xyz123nonexistent');

    // Wait for no results message
    await waitFor(() => {
      const noResults = canvas.queryByText(
        /No knowledgebase articles found matching your criteria/i
      );
      expect(noResults).toBeInTheDocument();
    });

    // Verify count is 0
    expect(
      canvas.getByText(/Knowledgebase articles \(0\)/i)
    ).toBeInTheDocument();
  },
};

/**
 * Test clearing search
 */
export const ClearSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Get search input and type
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    await userEvent.type(searchInput, 'Authentication');

    // Wait for filtered results
    await waitFor(() => {
      const count = canvas.queryByText(/Knowledgebase articles \(3\)/i);
      expect(count).toBeInTheDocument();
    });

    // Click clear button (SearchInput uses "Reset" as the aria-label)
    const clearButton = canvas.getByRole('button', { name: /reset/i });
    await userEvent.click(clearButton);

    // Verify all articles are shown again
    await waitFor(() => {
      expect(
        canvas.getByText(/Knowledgebase articles \(15\)/i)
      ).toBeInTheDocument();
    });

    // Verify article titles are visible again
    await waitFor(() => {
      const articles = canvas.queryAllByRole('link', {
        name: /System Information|Simple Content/i,
      });
      expect(articles.length).toBeGreaterThan(0);
    });
  },
};

/**
 * Test bundle scope toggle
 */
export const BundleScopeToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify toggle group is present
    const scopeToggle = document.querySelector(
      '[data-ouia-component-id="help-panel-kb-scope-toggle"]'
    );
    expect(scopeToggle).toBeInTheDocument();

    // Click All toggle to see all articles
    const allToggle = document.getElementById('kb-all-toggle') as HTMLElement;
    await userEvent.click(allToggle);

    // Verify All toggle is selected and shows all 15 articles
    await waitFor(() => {
      expect(allToggle).toHaveAttribute('aria-pressed', 'true');
      expect(
        canvas.getByText(/Knowledgebase articles \(15\)/i)
      ).toBeInTheDocument();
    });

    // Click back to bundle (insights/RHEL bundle)
    const bundleToggle = document.getElementById(
      'kb-bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    // Verify bundle toggle is selected and shows only Insights articles (3 articles)
    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
      expect(
        canvas.getByText(/Knowledgebase articles \(3\)/i)
      ).toBeInTheDocument();
    });

    // Verify Insights-tagged articles are visible
    await expectVisibleTitles(
      canvas,
      ['System Information Collected by Red Hat Insights'],
      ['Automation Analytics Security and Data Handling']
    );
  },
};

/**
 * Test pagination
 */
export const WithPagination: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify pagination is present
    const pagination = document.querySelector(
      '[data-ouia-component-id="help-panel-kb-pagination"]'
    );
    expect(pagination).toBeInTheDocument();

    // Verify first page shows articles
    await expectVisibleTitles(canvas, [
      'System Information Collected by Red Hat Insights',
    ]);

    // Verify article count shows all mock KB articles
    expect(
      canvas.getByText(/Knowledgebase articles \(15\)/i)
    ).toBeInTheDocument();
  },
};

/**
 * Test bundle tags display
 */
export const WithBundleTags: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify bundle tags are present on articles
    await waitFor(() => {
      const insightsTags = canvas.queryAllByText('Insights');
      expect(insightsTags.length).toBeGreaterThan(0);
    });

    // Verify multiple tag types exist (RHEL and IAM are all caps)
    await waitFor(() => {
      const rhelTags = canvas.queryAllByText('RHEL');
      expect(rhelTags.length).toBeGreaterThan(0);
    });
  },
};

/**
 * Test external link icons
 */
export const WithExternalLinks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify article links have external link icons and proper attributes
    await waitFor(() => {
      const articleLinks = canvas.queryAllByRole('link', {
        name: /System Information Collected/i,
      });
      expect(articleLinks.length).toBeGreaterThan(0);

      // Check that the link has target="_blank"
      articleLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    // Verify Customer Portal link
    const portalLink = canvas.getByRole('link', { name: /Customer Portal/i });
    expect(portalLink).toHaveAttribute('target', '_blank');
    expect(portalLink).toHaveAttribute('rel', 'noopener noreferrer');
  },
};

/**
 * Test combination: Search + Bundle scope
 */
export const SearchWithBundleScope: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Switch to bundle scope (insights)
    const bundleToggle = document.getElementById(
      'kb-bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    // Verify bundle toggle is selected
    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });

    // Perform search for "Troubleshoot"
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    await userEvent.type(searchInput, 'Troubleshoot');

    // Wait for filtered results (only 1 Insights article with "Troubleshoot")
    await waitFor(() => {
      const count = canvas.queryByText(/Knowledgebase articles \(1\)/i);
      expect(count).toBeInTheDocument();
    });

    // Verify correct article is shown
    await expectVisibleTitles(
      canvas,
      ['How to Troubleshoot Insights Client Connection Issues'],
      ['Troubleshooting Ansible Connection Errors']
    );
  },
};

/**
 * Story using real data from recommendedContentConfig
 * Tests getAllKBArticles() and actual KB article data
 */
export const WithRealData: Story = {
  render: () => {
    const [quickStartStates, setQuickStartStates] =
      useState<AllQuickStartStates>({});

    const quickStartContextValue = useValuesForQuickStartContext({
      allQuickStarts: [],
      activeQuickStartID: '',
      setActiveQuickStartID: () => {},
      allQuickStartStates: quickStartStates,
      setAllQuickStartStates: setQuickStartStates,
      useQueryParams: false,
    });

    // Update window.insights.chrome to return the correct bundle
    React.useEffect(() => {
      /* eslint-disable rulesdir/no-chrome-api-call-from-window */
      if (typeof window !== 'undefined' && window.insights?.chrome) {
        const originalGetBundleData = window.insights.chrome.getBundleData;
        const originalGetAvailableBundles =
          window.insights.chrome.getAvailableBundles;

        window.insights.chrome.getBundleData = () => ({ bundleId: 'insights' });
        window.insights.chrome.getAvailableBundles = () => [
          { id: 'insights', title: 'RHEL' },
          { id: 'ansible', title: 'Ansible' },
          { id: 'openshift', title: 'OpenShift' },
        ];

        return () => {
          window.insights.chrome.getBundleData = originalGetBundleData;
          window.insights.chrome.getAvailableBundles =
            originalGetAvailableBundles;
        };
      }
      /* eslint-enable rulesdir/no-chrome-api-call-from-window */
    }, []);

    return (
      <IntlProvider locale="en" defaultLocale="en">
        <QuickStartContextProvider value={quickStartContextValue}>
          <div style={{ height: '600px', width: '400px' }}>
            <KBPanel setNewActionTitle={() => {}} />
          </div>
        </QuickStartContextProvider>
      </IntlProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify KB articles list from real data is visible
    const articlesList = document.querySelector(
      '[data-ouia-component-id="help-panel-kb-articles-list"]'
    );
    const dataList = articlesList?.querySelector('[role="list"]');
    expect(dataList).toBeInTheDocument();

    // Verify search input is present
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    expect(searchInput).toBeInTheDocument();

    // Verify article count shows real KB articles from recommendedContentConfig
    // The actual count depends on bundleRecommendedContent configuration
    const countText = canvas.queryByText(/Knowledgebase articles \(\d+\)/i);
    expect(countText).toBeInTheDocument();

    // Verify at least one article is visible
    await waitFor(() => {
      const articles = canvas.queryAllByRole('link', {
        name: /.+/i,
      });
      expect(articles.length).toBeGreaterThan(0);
    });
  },
};
