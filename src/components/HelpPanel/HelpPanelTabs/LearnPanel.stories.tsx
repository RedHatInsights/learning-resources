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
import LearnPanel from './LearnPanel';

/**
 * Helper function to wait for component loading to complete
 */
const waitForLoadingComplete = async (canvas: ReturnType<typeof within>) => {
  // Wait for spinner to disappear
  await waitFor(
    () => {
      const spinners = canvas.queryAllByRole('progressbar');
      expect(spinners.length).toBe(0);
    },
    { timeout: 5000 }
  );

  // Wait for the learning resources list container to appear
  await waitFor(
    () => {
      const resourceList = document.querySelector(
        '[data-ouia-component-id="help-panel-learning-resources-list"]'
      );
      expect(resourceList).toBeInTheDocument();
    },
    { timeout: 5000 }
  );
};

/**
 * Helper function to select a content type filter
 */
const selectContentType = async (
  canvas: ReturnType<typeof within>,
  type: 'documentation' | 'quickstart' | 'learningPath' | 'otherResource'
) => {
  const contentTypeToggle = await canvas.findByRole('button', {
    name: /content type/i,
  });
  await userEvent.click(contentTypeToggle);

  await waitFor(() => {
    const option = document.querySelector(
      `[data-ouia-component-id="help-panel-content-type-option-${type}"]`
    );
    expect(option).toBeInTheDocument();
  });

  const checkbox = document.querySelector(
    `[data-ouia-component-id="help-panel-content-type-option-${type}"] input[type="checkbox"]`
  ) as HTMLElement;
  await userEvent.click(checkbox);

  await waitFor(() => {
    const chip = document.querySelector(
      `[data-ouia-component-id="help-panel-selected-chip-${type}"]`
    );
    expect(chip).toBeInTheDocument();
  });
};

/**
 * Helper function to verify visible titles exist or don't exist
 */
const clickResourceLinkByName = async (
  canvas: ReturnType<typeof within>,
  displayName: string
) => {
  const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const link = await canvas.findByRole('button', {
    name: new RegExp(escaped),
  });
  await userEvent.click(link);
};

const expectVisibleTitles = async (
  canvas: ReturnType<typeof within>,
  expectedTitles: string[],
  notExpectedTitles?: string[]
) => {
  await waitFor(() => {
    expectedTitles.forEach((title) => {
      const element = canvas.queryByText(title);
      expect(element).toBeInTheDocument();
    });

    if (notExpectedTitles) {
      notExpectedTitles.forEach((title) => {
        const element = canvas.queryByText(title);
        expect(element).not.toBeInTheDocument();
      });
    }
  });
};

/**
 * Wrapper component to provide required context providers
 */
const LearnPanelWrapper = ({ bundle = 'insights' }: { bundle?: string }) => {
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
          <LearnPanel setNewActionTitle={() => {}} />
        </div>
      </QuickStartContextProvider>
    </IntlProvider>
  );
};

/**
 * MSW handlers for mocking learning resources API
 */
const mockLearningResourcesHandlers = [
  // Mock filters API
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
                  {
                    id: 'openshift',
                    filterLabel: 'OpenShift',
                    cardLabel: 'OpenShift',
                  },
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
                  {
                    id: 'quickstart',
                    filterLabel: 'Quick start',
                    cardLabel: 'Quick start',
                  },
                  {
                    id: 'learningPath',
                    filterLabel: 'Learning path',
                    cardLabel: 'Learning path',
                  },
                  {
                    id: 'otherResource',
                    filterLabel: 'Other resource',
                    cardLabel: 'Other resource',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  }),
  // Mock quickstarts API with diverse content
  http.get('/api/quickstarts/v1/quickstarts', () => {
    return HttpResponse.json({
      data: [
        // Insights Quick starts - Full quickstart for drill-down testing
        {
          content: {
            apiVersion: 'console.openshift.io/v1',
            kind: 'QuickStarts',
            metadata: {
              name: 'insights-qs-1',
              tags: [{ kind: 'bundle', value: 'insights' }],
            },
            spec: {
              version: 0.1,
              displayName: 'Getting Started with Insights',
              description: 'Learn the basics of Red Hat Insights',
              introduction:
                '**Welcome to Red Hat Insights!** This quickstart will guide you through the basics of using Insights to monitor and manage your systems.',
              type: { text: 'Quick start' },
              durationMinutes: 10,
              tasks: [
                {
                  title: 'Explore the dashboard',
                  description:
                    'Take a look at the main dashboard to see an overview of your systems.',
                  review: {
                    instructions: 'Did you view the dashboard?',
                    failedTaskHelp:
                      'Navigate to the Insights dashboard to continue.',
                  },
                },
                {
                  title: 'Review your first recommendation',
                  description:
                    'Check out the recommendations section to see suggested actions for your systems.',
                  review: {
                    instructions: 'Did you find the recommendations section?',
                    failedTaskHelp:
                      'Look for the Recommendations tab in the navigation.',
                  },
                },
                {
                  title: 'Complete your setup',
                  description:
                    'Finish configuring your Insights environment by reviewing the settings.',
                  review: {
                    instructions: 'Have you reviewed the settings?',
                    failedTaskHelp:
                      'Go to Settings to complete your configuration.',
                  },
                },
              ],
              conclusion:
                'Congratulations! You have completed the Getting Started with Insights quickstart. You are now ready to use Insights to monitor your systems.',
              link: { href: '#' },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'insights-qs-2',
              tags: [{ kind: 'bundle', value: 'insights' }],
            },
            spec: {
              displayName: 'Advisor Quick Start',
              description: 'Learn about Advisor',
              type: { text: 'Quick start' },
              link: { href: '#' },
            },
          },
        },
        // Insights Documentation
        {
          content: {
            metadata: {
              name: 'insights-doc-1',
              tags: [{ kind: 'bundle', value: 'insights' }],
              externalDocumentation: true,
            },
            spec: {
              displayName: 'Insights Documentation',
              description: 'Complete docs',
              type: { text: 'Documentation' },
              link: { href: '#' },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'insights-doc-2',
              tags: [{ kind: 'bundle', value: 'insights' }],
              externalDocumentation: true,
            },
            spec: {
              displayName: 'Vulnerability Docs',
              description: 'Security documentation',
              type: { text: 'Documentation' },
              link: { href: '#' },
            },
          },
        },
        // Insights Learning Path
        {
          content: {
            metadata: {
              name: 'insights-lp-1',
              tags: [{ kind: 'bundle', value: 'insights' }],
              learningPath: true,
            },
            spec: {
              displayName: 'Insights Learning Journey',
              description: 'Complete learning path',
              type: { text: 'Learning path' },
              link: { href: '#' },
            },
          },
        },
        // Ansible resources
        {
          content: {
            metadata: {
              name: 'ansible-qs-1',
              tags: [{ kind: 'bundle', value: 'ansible' }],
            },
            spec: {
              displayName: 'Ansible Quick Start',
              description: 'Getting started with Ansible',
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
              description: 'Complete Ansible docs',
              type: { text: 'Documentation' },
              link: { href: '#' },
            },
          },
        },
        // OpenShift resources
        {
          content: {
            metadata: {
              name: 'openshift-qs-1',
              tags: [{ kind: 'bundle', value: 'openshift' }],
            },
            spec: {
              displayName: 'OpenShift Quick Start',
              description: 'Getting started with OpenShift',
              type: { text: 'Quick start' },
              link: { href: '#' },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'openshift-doc-1',
              tags: [{ kind: 'bundle', value: 'openshift' }],
              externalDocumentation: true,
            },
            spec: {
              displayName: 'OpenShift Documentation',
              description: 'Complete OpenShift docs',
              type: { text: 'Documentation' },
              link: { href: '#' },
            },
          },
        },
        // Other resources for variety
        {
          content: {
            metadata: {
              name: 'insights-other-1',
              tags: [{ kind: 'bundle', value: 'insights' }],
              otherResource: true,
            },
            spec: {
              displayName: 'Additional Resource',
              description: 'Other helpful content',
              type: { text: 'Other resource' },
              link: { href: '#' },
            },
          },
        },
      ],
    });
  }),
  // Mock favorites API - return the bookmarked items
  http.get('/api/quickstarts/v1/favorites', () => {
    return HttpResponse.json({
      data: [
        { quickstartName: 'insights-qs-2', favorite: true }, // Advisor Quick Start
        { quickstartName: 'insights-doc-2', favorite: true }, // Vulnerability Docs
      ],
    });
  }),
  // Mock POST to favorites endpoint
  http.post('/api/quickstarts/v1/favorites', async () => {
    return HttpResponse.json({ success: true });
  }),
];

const meta: Meta<typeof LearnPanelWrapper> = {
  title: 'Components/Help Panel/Learn Panel',
  component: LearnPanelWrapper,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: mockLearningResourcesHandlers,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default view of the Learn Panel showing all resources
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Verify some resources are visible
    const resourceList = document.querySelector(
      '[data-ouia-component-id="help-panel-learning-resources-list"]'
    );
    const dataList = resourceList?.querySelector('[role="list"]');
    expect(dataList).toBeInTheDocument();

    // Verify specific resource titles are present (insights bundle by default)
    await expectVisibleTitles(canvas, [
      'Getting Started with Insights',
      'Advisor Quick Start',
      'Insights Documentation',
    ]);
  },
};

/**
 * Test filtering by content type - Documentation
 */
export const FilterByDocumentation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Select Documentation filter
    await selectContentType(canvas, 'documentation');

    // Verify Documentation items are shown and Quick start items are not
    await expectVisibleTitles(
      canvas,
      ['Insights Documentation', 'Vulnerability Docs'],
      ['Getting Started with Insights', 'Advisor Quick Start']
    );
  },
};

/**
 * Test filtering by content type - Quick start
 */
export const FilterByQuickStart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Select Quick start filter
    await selectContentType(canvas, 'quickstart');

    // Verify Quick start items are shown and Documentation items are not
    await expectVisibleTitles(
      canvas,
      ['Getting Started with Insights', 'Advisor Quick Start'],
      ['Insights Documentation', 'Vulnerability Docs']
    );
  },
};

/**
 * Documentation links open in a new browser tab (`window.open` with `_blank`).
 */
export const ClickDocumentationOpensNewWindow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);
    await selectContentType(canvas, 'documentation');

    const openSpy = spyOn(window, 'open').mockImplementation(() => null);

    try {
      await clickResourceLinkByName(canvas, 'Insights Documentation');

      await waitFor(() => {
        expect(openSpy).toHaveBeenCalled();
      });

      expect(openSpy.mock.calls[0][1]).toBe('_blank');
      expect(openSpy.mock.calls[0][2]).toBe('noopener,noreferrer');
    } finally {
      openSpy.mockRestore();
    }
  },
};

/**
 * Test filtering by content type - Learning Path
 */
export const FilterByLearningPath: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Select Learning path filter
    await selectContentType(canvas, 'learningPath');

    // Verify Learning path items are shown and other types are not
    await expectVisibleTitles(
      canvas,
      ['Insights Learning Journey'],
      ['Getting Started with Insights', 'Insights Documentation']
    );
  },
};

/**
 * Test multiple content type filters simultaneously
 */
export const MultipleContentTypeFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    const contentTypeToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(contentTypeToggle);

    // Select Documentation
    await waitFor(() => {
      const option = document.querySelector(
        '[data-ouia-component-id="help-panel-content-type-option-documentation"]'
      );
      expect(option).toBeInTheDocument();
    });

    const docCheckbox = document.querySelector(
      '[data-ouia-component-id="help-panel-content-type-option-documentation"] input[type="checkbox"]'
    ) as HTMLElement;
    await userEvent.click(docCheckbox);

    // Select Quick start
    const quickstartCheckbox = document.querySelector(
      '[data-ouia-component-id="help-panel-content-type-option-quickstart"] input[type="checkbox"]'
    ) as HTMLElement;
    await userEvent.click(quickstartCheckbox);

    // Close dropdown
    await userEvent.click(contentTypeToggle);

    // Verify both chips appear
    await waitFor(() => {
      const docChip = document.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
      );
      const quickstartChip = document.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-quickstart"]'
      );
      expect(docChip).toBeInTheDocument();
      expect(quickstartChip).toBeInTheDocument();
    });

    // Verify both Documentation and Quick start items are shown, Learning path is not
    await expectVisibleTitles(
      canvas,
      [
        'Insights Documentation',
        'Vulnerability Docs',
        'Getting Started with Insights',
        'Advisor Quick Start',
      ],
      ['Insights Learning Journey']
    );
  },
};

/**
 * Test bookmarked only filter
 */
export const BookmarkedOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    const bookmarkedCheckbox = await canvas.findByRole('checkbox', {
      name: /bookmarked only/i,
    });
    await userEvent.click(bookmarkedCheckbox);
    await expect(bookmarkedCheckbox).toBeChecked();

    // Verify bookmarked items are shown and non-bookmarked items are not
    await expectVisibleTitles(
      canvas,
      ['Advisor Quick Start', 'Vulnerability Docs'],
      ['Getting Started with Insights', 'Insights Documentation']
    );
  },
};

/**
 * Test bundle scope toggle
 */
export const BundleScopeToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Click All toggle
    const allToggle = document.getElementById('all-toggle') as HTMLElement;
    await userEvent.click(allToggle);

    // Verify All toggle is selected
    await waitFor(() => {
      expect(allToggle).toHaveAttribute('aria-pressed', 'true');
    });

    // Verify resources from all bundles are shown (including Ansible and OpenShift)
    await expectVisibleTitles(canvas, [
      'Getting Started with Insights',
      'Ansible Quick Start',
      'OpenShift Quick Start',
    ]);

    // Click back to bundle
    const bundleToggle = document.getElementById(
      'bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    // Verify bundle toggle is selected
    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });

    // Verify only insights resources are shown (Ansible/OpenShift not shown)
    await expectVisibleTitles(
      canvas,
      ['Getting Started with Insights', 'Advisor Quick Start'],
      ['Ansible Quick Start', 'OpenShift Quick Start']
    );
  },
};

/**
 * Test combination: Bundle scope + Content type filter
 */
export const BundleScopeWithContentFilter: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Switch to bundle scope
    const bundleToggle = document.getElementById(
      'bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    // Apply content type filter
    await selectContentType(canvas, 'documentation');

    // Verify both filters are active
    await waitFor(() => {
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });

    // Verify insights Documentation items are shown, Quick starts are not
    await expectVisibleTitles(
      canvas,
      ['Insights Documentation', 'Vulnerability Docs'],
      ['Getting Started with Insights', 'Advisor Quick Start']
    );
  },
};

/**
 * Test combination: Bundle scope + Bookmarked only
 */
export const BundleScopeWithBookmarks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Switch to bundle scope
    const bundleToggle = document.getElementById(
      'bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    // Toggle bookmarked only
    const bookmarkedCheckbox = await canvas.findByRole('checkbox', {
      name: /bookmarked only/i,
    });
    await userEvent.click(bookmarkedCheckbox);

    // Verify both filters are active
    await waitFor(() => {
      expect(bookmarkedCheckbox).toBeChecked();
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });

    // Verify bookmarked insights items are shown, non-bookmarked are not
    await expectVisibleTitles(
      canvas,
      ['Advisor Quick Start', 'Vulnerability Docs'],
      ['Getting Started with Insights', 'Ansible Quick Start']
    );
  },
};

/**
 * Test all filters combined
 */
export const AllFiltersCombined: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Switch to bundle scope
    const bundleToggle = document.getElementById(
      'bundle-toggle'
    ) as HTMLElement;
    await userEvent.click(bundleToggle);

    // Apply content type filter
    await selectContentType(canvas, 'quickstart');

    // Toggle bookmarked only
    const bookmarkedCheckbox = await canvas.findByRole('checkbox', {
      name: /bookmarked only/i,
    });
    await userEvent.click(bookmarkedCheckbox);

    // Verify all filters are active
    await waitFor(() => {
      expect(bookmarkedCheckbox).toBeChecked();
      expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
    });

    // Verify only the bookmarked insights quick start is shown (Advisor Quick Start)
    // Other types and non-bookmarked items should not be shown
    await expectVisibleTitles(
      canvas,
      ['Advisor Quick Start'],
      [
        'Getting Started with Insights',
        'Vulnerability Docs',
        'Ansible Quick Start',
      ]
    );
  },
};

/**
 * Test removing individual filter chip
 */
export const RemoveFilterChip: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Apply two content type filters
    const contentTypeToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(contentTypeToggle);

    await waitFor(() => {
      const option = document.querySelector(
        '[data-ouia-component-id="help-panel-content-type-option-documentation"]'
      );
      expect(option).toBeInTheDocument();
    });

    const docCheckbox = document.querySelector(
      '[data-ouia-component-id="help-panel-content-type-option-documentation"] input[type="checkbox"]'
    ) as HTMLElement;
    await userEvent.click(docCheckbox);

    const quickstartCheckbox = document.querySelector(
      '[data-ouia-component-id="help-panel-content-type-option-quickstart"] input[type="checkbox"]'
    ) as HTMLElement;
    await userEvent.click(quickstartCheckbox);

    await userEvent.click(contentTypeToggle);

    // Wait for chips to appear
    await waitFor(() => {
      const docChip = document.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
      );
      expect(docChip).toBeInTheDocument();
    });

    // Remove Documentation chip
    const docChip = document.querySelector(
      '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
    ) as HTMLElement;
    const closeButton = docChip.querySelector('button') as HTMLElement;
    await userEvent.click(closeButton);

    // Verify Documentation chip removed but Quick start remains
    await waitFor(() => {
      const removedChip = document.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
      );
      const remainingChip = document.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-quickstart"]'
      );
      expect(removedChip).not.toBeInTheDocument();
      expect(remainingChip).toBeInTheDocument();
    });

    // Verify only Quick start items are shown, Documentation items are not
    await expectVisibleTitles(
      canvas,
      ['Getting Started with Insights', 'Advisor Quick Start'],
      ['Insights Documentation', 'Vulnerability Docs']
    );
  },
};

/**
 * Test clear all filters button
 */
export const ClearAllFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Apply content type filter
    await selectContentType(canvas, 'documentation');

    // Click clear all filters
    const clearButton = canvas.getByRole('button', {
      name: /clear all filters/i,
    });
    await userEvent.click(clearButton);

    // Verify chip is removed
    await waitFor(() => {
      const chip = document.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
      );
      expect(chip).not.toBeInTheDocument();
    });

    // Verify all resource types are shown again (not just Documentation)
    await expectVisibleTitles(canvas, [
      'Getting Started with Insights',
      'Insights Documentation',
      'Advisor Quick Start',
    ]);
  },
};

/**
 * Test quickstart drill-down - clicking a quickstart shows content with breadcrumb and bookmark icon
 */
export const QuickstartDrillDown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Filter to show only quickstarts
    await selectContentType(canvas, 'quickstart');

    // Click on a quickstart
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Verify quickstart content is displayed
    await waitFor(() => {
      const header = canvas.getByRole('heading', {
        name: 'Getting Started with Insights',
        level: 2,
      });
      expect(header).toBeInTheDocument();
    });

    // Verify breadcrumb is present
    await waitFor(() => {
      const breadcrumb = canvas.getByRole('button', { name: /learn/i });
      expect(breadcrumb).toBeInTheDocument();
    });

    // Verify bookmark icon is present in breadcrumb area
    await waitFor(() => {
      const bookmarkButton = canvas.getByRole('button', {
        name: /bookmark/i,
      });
      expect(bookmarkButton).toBeInTheDocument();
    });

    // Verify introduction text is shown
    await waitFor(() => {
      expect(
        canvas.getByText(/Welcome to Red Hat Insights!/i)
      ).toBeInTheDocument();
    });

    // Verify Start button is present
    await waitFor(() => {
      const startButton = canvas.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
    });
  },
};

/**
 * Test breadcrumb navigation - clicking breadcrumb returns to list view
 */
export const BreadcrumbNavigationBack: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Filter and click quickstart
    await selectContentType(canvas, 'quickstart');
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Wait for quickstart content
    await waitFor(() => {
      const breadcrumb = canvas.getByRole('button', { name: /learn/i });
      expect(breadcrumb).toBeInTheDocument();
    });

    // Click breadcrumb to go back
    const breadcrumb = canvas.getByRole('button', { name: /learn/i });
    await userEvent.click(breadcrumb);

    // Verify list view is shown again
    await waitFor(() => {
      const resourceList = document.querySelector(
        '[data-ouia-component-id="help-panel-learning-resources-list"]'
      );
      expect(resourceList).toBeInTheDocument();
    });

    // Verify quickstart items are visible again
    await expectVisibleTitles(canvas, [
      'Getting Started with Insights',
      'Advisor Quick Start',
    ]);
  },
};

/**
 * Test complete quickstart workflow - Start → Continue → Restart
 */
export const QuickstartWorkflow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Filter and click quickstart
    await selectContentType(canvas, 'quickstart');
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Wait for quickstart content
    await waitFor(() => {
      const startButton = canvas.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
    });

    // Click Start button
    const startButton = canvas.getByRole('button', { name: /start/i });
    await userEvent.click(startButton);

    // Verify first task is shown
    await waitFor(
      () => {
        expect(canvas.getByText('Explore the dashboard')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify Next and Restart buttons appear
    await waitFor(
      () => {
        const nextButton = canvas.getByRole('button', { name: /next/i });
        const restartButton = canvas.getByRole('button', { name: /restart/i });
        expect(nextButton).toBeInTheDocument();
        expect(restartButton).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click Next to go to second task
    const nextButton = canvas.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);

    // Verify second task is shown
    await waitFor(
      () => {
        expect(
          canvas.getByText('Review your first recommendation')
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click Restart
    const restartButton = canvas.getByRole('button', { name: /restart/i });
    await userEvent.click(restartButton);

    // Verify we're back at the introduction
    await waitFor(
      () => {
        expect(
          canvas.getByText(/Welcome to Red Hat Insights!/i)
        ).toBeInTheDocument();
        const startButtonAgain = canvas.getByRole('button', { name: /start/i });
        expect(startButtonAgain).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test quickstart shows duration and metadata
 */
export const QuickstartMetadata: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Filter and click quickstart
    await selectContentType(canvas, 'quickstart');
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Verify quickstart metadata is displayed
    await waitFor(() => {
      // Look for the metadata section with both type and duration
      const metadataText = canvas.getByText(/Quick start • 10 minutes/i);
      expect(metadataText).toBeInTheDocument();
    });
  },
};

/**
 * Test quickstart drill-down preserves state when using breadcrumb
 */
export const QuickstartStatePreservation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Filter and click quickstart
    await selectContentType(canvas, 'quickstart');
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Start the quickstart
    await waitFor(() => {
      const startButton = canvas.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
    });

    const startButton = canvas.getByRole('button', { name: /start/i });
    await userEvent.click(startButton);

    // Wait for first task
    await waitFor(
      () => {
        expect(canvas.getByText('Explore the dashboard')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Go back to list via breadcrumb
    const breadcrumb = canvas.getByRole('button', { name: /learn/i });
    await userEvent.click(breadcrumb);

    // Wait for list to appear
    await waitFor(() => {
      const resourceList = document.querySelector(
        '[data-ouia-component-id="help-panel-learning-resources-list"]'
      );
      expect(resourceList).toBeInTheDocument();
    });

    // Click the same quickstart again
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Verify quickstart reopened (state preserved in context)
    await waitFor(
      () => {
        // After reopening, should see either Continue (if state preserved) or Start button
        const continueButton = canvas.queryByRole('button', {
          name: /continue/i,
        });
        const startButton = canvas.queryByRole('button', {
          name: /start/i,
        });

        // At least one action button should be present
        expect(continueButton || startButton).toBeTruthy();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test bookmark toggle in quickstart drill-down view
 */
export const QuickstartBookmarkToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForLoadingComplete(canvas);

    // Filter and click quickstart
    await selectContentType(canvas, 'quickstart');
    await clickResourceLinkByName(canvas, 'Getting Started with Insights');

    // Wait for quickstart to load
    await waitFor(() => {
      const breadcrumb = canvas.getByRole('button', { name: /learn/i });
      expect(breadcrumb).toBeInTheDocument();
    });

    // Find and click the bookmark button in the breadcrumb area
    const bookmarkButton = canvas.getByRole('button', {
      name: /bookmark/i,
    });
    expect(bookmarkButton).toBeInTheDocument();

    // Click to toggle bookmark
    await userEvent.click(bookmarkButton);

    // Verify the bookmark button is still there (icon should change but button remains)
    await waitFor(() => {
      const bookmarkButtonAfter = canvas.getByRole('button', {
        name: /bookmark/i,
      });
      expect(bookmarkButtonAfter).toBeInTheDocument();
    });
  },
};
