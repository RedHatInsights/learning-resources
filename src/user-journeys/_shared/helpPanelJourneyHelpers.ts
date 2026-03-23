import { expect, userEvent, waitFor, within } from 'storybook/test';
import { HttpResponse, http } from 'msw';
import { TEST_TIMEOUTS, delay } from './testConstants';

/**
 * Shared MSW handlers for Help Panel user journeys.
 * These mock the learning resources API endpoints.
 */
export const helpPanelMswHandlers = [
  // Mock filters API - must return categories structure
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
                  {
                    id: 'insights',
                    filterLabel: 'RHEL',
                    cardLabel: 'RHEL (Red Hat Enterprise Linux)',
                  },
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
                ],
              },
            ],
          },
        ],
      },
    });
  }),
  // Mock quickstarts API (accepts optional query params: display-name, fuzzy)
  http.get('/api/quickstarts/v1/quickstarts', () => {
    return HttpResponse.json({
      data: [
        // Ansible resources (shown first to make bundle filtering more visible)
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
        {
          content: {
            metadata: {
              name: 'ansible-docs',
              tags: [{ kind: 'bundle', value: 'ansible' }],
              externalDocumentation: true,
              favorite: false,
            },
            spec: {
              displayName: 'Ansible Automation Platform Documentation',
              description: 'Complete Ansible documentation',
              type: { text: 'Documentation' },
              link: { href: 'https://access.redhat.com/documentation/ansible' },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'ansible-playbooks',
              tags: [{ kind: 'bundle', value: 'ansible' }],
              favorite: false,
            },
            spec: {
              displayName: 'Creating Ansible Playbooks',
              description: 'Learn how to create and manage Ansible playbooks',
              type: { text: 'Quick start' },
              link: {
                href: 'https://console.redhat.com/ansible/playbooks',
              },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'ansible-inventory',
              tags: [{ kind: 'bundle', value: 'ansible' }],
              externalDocumentation: true,
              favorite: false,
            },
            spec: {
              displayName: 'Managing Ansible Inventory',
              description: 'Manage your infrastructure inventory in Ansible',
              type: { text: 'Documentation' },
              link: {
                href: 'https://access.redhat.com/documentation/ansible/inventory',
              },
            },
          },
        },
        // OpenShift resources
        {
          content: {
            metadata: {
              name: 'openshift-getting-started',
              tags: [{ kind: 'bundle', value: 'openshift' }],
              favorite: false,
            },
            spec: {
              displayName: 'Getting Started with OpenShift',
              description: 'Introduction to OpenShift',
              type: { text: 'Quick start' },
              link: {
                href: 'https://console.redhat.com/openshift/getting-started',
              },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'openshift-docs',
              tags: [{ kind: 'bundle', value: 'openshift' }],
              externalDocumentation: true,
              favorite: false,
            },
            spec: {
              displayName: 'OpenShift Documentation',
              description: 'Complete OpenShift documentation',
              type: { text: 'Documentation' },
              link: {
                href: 'https://access.redhat.com/documentation/openshift',
              },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'openshift-deploy',
              tags: [{ kind: 'bundle', value: 'openshift' }],
              favorite: false,
            },
            spec: {
              displayName: 'Deploying Applications on OpenShift',
              description: 'Deploy and manage containerized applications',
              type: { text: 'Quick start' },
              link: {
                href: 'https://console.redhat.com/openshift/deploy',
              },
            },
          },
        },
        {
          content: {
            metadata: {
              name: 'openshift-networking',
              tags: [{ kind: 'bundle', value: 'openshift' }],
              externalDocumentation: true,
              favorite: false,
            },
            spec: {
              displayName: 'OpenShift Networking Guide',
              description: 'Configure networking for OpenShift clusters',
              type: { text: 'Documentation' },
              link: {
                href: 'https://access.redhat.com/documentation/openshift/networking',
              },
            },
          },
        },
        // Insights resources (current bundle)
        {
          content: {
            metadata: {
              name: 'getting-started-insights',
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
              name: 'vulnerability-docs',
              tags: [{ kind: 'bundle', value: 'insights' }],
              externalDocumentation: true,
              favorite: true,
            },
            spec: {
              displayName: 'Vulnerability Management Documentation',
              description: 'Learn about vulnerability management',
              type: { text: 'Documentation' },
              link: {
                href: 'https://access.redhat.com/documentation/vulnerability',
              },
            },
          },
        },
      ],
    });
  }),
  // Mock favorites API
  http.get('/api/quickstarts/v1/favorites', () => {
    return HttpResponse.json({
      data: [],
    });
  }),
  // Mock user identity (favorite pages) - needed when search flag is enabled
  http.get('/api/chrome-service/v1/user', () => {
    return HttpResponse.json({
      data: {
        favoritePages: [],
      },
    });
  }),
  // Mock bundle info - needed when search panel loads
  http.get('/api/chrome-service/v1/static/api-specs-generated.json', () => {
    return HttpResponse.json([]);
  }),
  // Mock bundles - needed when search panel loads
  http.get('/api/chrome-service/v1/static/bundles-generated.json', () => {
    return HttpResponse.json([]);
  }),
  // Mock favorite pages toggle
  http.post('/api/chrome-service/v1/favorite-pages', async ({ request }) => {
    const body = (await request.json()) as {
      pathname: string;
      favorite: boolean;
    };
    return HttpResponse.json([
      { pathname: body.pathname, favorite: body.favorite },
    ]);
  }),
  // Mock bookmark toggle
  http.post('/api/quickstarts/v1/favorites', async () => {
    return HttpResponse.json({ success: true });
  }),
];

/**
 * Shared MSW handlers for Search Panel user journeys.
 * Overrides come FIRST because MSW matches the first matching handler.
 */
export const searchPanelJourneyMswHandlers = [
  // Quickstarts search API (fuzzy-aware; must precede the base handler)
  http.get('/api/quickstarts/v1/quickstarts', ({ request }) => {
    const url = new URL(request.url);
    const displayName = url.searchParams.get('display-name') || '';
    const allResources = [
      {
        content: {
          metadata: {
            name: 'getting-started-insights',
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
      {
        content: {
          metadata: {
            name: 'openshift-getting-started',
            tags: [{ kind: 'bundle', value: 'openshift' }],
            favorite: false,
          },
          spec: {
            displayName: 'Getting Started with OpenShift',
            description: 'Introduction to OpenShift',
            type: { text: 'Quick start' },
            link: {
              href: 'https://console.redhat.com/openshift/getting-started',
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
  // Bundle info (API specs)
  http.get('/api/chrome-service/v1/static/api-specs-generated.json', () => {
    return HttpResponse.json([
      {
        bundleLabels: ['insights'],
        frontendName: 'Advisor API',
        url: 'https://developers.redhat.com/api-catalog/api/advisor',
      },
      {
        bundleLabels: ['ansible'],
        frontendName: 'Automation Hub API',
        url: 'https://developers.redhat.com/api-catalog/api/automation-hub',
      },
    ]);
  }),
  // Bundles (navigation + services)
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
    ]);
  }),
  // User identity (favorite pages)
  http.get('/api/chrome-service/v1/user', () => {
    return HttpResponse.json({
      data: {
        favoritePages: [{ pathname: '/insights/advisor', favorite: true }],
      },
    });
  }),
  // Toggle favorite pages
  http.post('/api/chrome-service/v1/favorite-pages', async ({ request }) => {
    const body = (await request.json()) as {
      pathname: string;
      favorite: boolean;
    };
    return HttpResponse.json([
      { pathname: body.pathname, favorite: body.favorite },
    ]);
  }),
  // Favorites (bookmarks) API
  http.get('/api/quickstarts/v1/favorites', () => {
    return HttpResponse.json({
      data: [{ quickstartName: 'advisor-quickstart', favorite: true }],
    });
  }),
  // Toggle bookmark
  http.post('/api/quickstarts/v1/favorites', async () => {
    return HttpResponse.json({ success: true });
  }),
  // Base handlers last (overridden routes above take priority in MSW)
  ...helpPanelMswHandlers,
];

/**
 * Mock knowledgebase articles for KB Panel testing
 */
export const mockKBArticles = [
  // Insights/RHEL articles
  {
    id: 'kb-insights-1',
    title: 'System Information Collected by Red Hat Insights',
    url: 'https://access.redhat.com/articles/1598863',
    bundleTags: ['insights', 'rhel'],
  },
  {
    id: 'kb-insights-2',
    title: 'How to Troubleshoot Insights Client Connection Issues',
    url: 'https://access.redhat.com/articles/1234567',
    bundleTags: ['insights', 'rhel'],
  },
  {
    id: 'kb-insights-3',
    title: 'Understanding Insights Recommendations and Remediation',
    url: 'https://access.redhat.com/articles/1234568',
    bundleTags: ['insights', 'rhel'],
  },
  // Ansible articles
  {
    id: 'kb-ansible-1',
    title: 'Automation Analytics Security and Data Handling',
    url: 'https://access.redhat.com/articles/4501671',
    bundleTags: ['ansible'],
  },
  {
    id: 'kb-ansible-2',
    title: 'Ansible Automation Platform: Playbook Best Practices',
    url: 'https://access.redhat.com/articles/2234567',
    bundleTags: ['ansible'],
  },
  {
    id: 'kb-ansible-3',
    title: 'Troubleshooting Ansible Connection Errors',
    url: 'https://access.redhat.com/articles/2234568',
    bundleTags: ['ansible'],
  },
  // OpenShift articles
  {
    id: 'kb-openshift-1',
    title: 'What data is sent to Red Hat for cost management and telemetry?',
    url: 'https://access.redhat.com/articles/6512501',
    bundleTags: ['openshift'],
  },
  {
    id: 'kb-openshift-2',
    title: 'OpenShift Cluster Authentication and Authorization',
    url: 'https://access.redhat.com/articles/3234567',
    bundleTags: ['openshift'],
  },
  {
    id: 'kb-openshift-3',
    title: 'Debugging OpenShift Networking Issues',
    url: 'https://access.redhat.com/articles/3234568',
    bundleTags: ['openshift'],
  },
  // IAM articles
  {
    id: 'kb-iam-1',
    title: 'How to switch from Basic Auth to Certificate Authentication',
    url: 'https://access.redhat.com/articles/7040601',
    bundleTags: ['iam', 'rhel'],
  },
  {
    id: 'kb-iam-2',
    title: 'Transition to token-based authentication via service accounts',
    url: 'https://access.redhat.com/articles/7036194',
    bundleTags: ['iam'],
  },
  // Subscriptions articles
  {
    id: 'kb-subscriptions-1',
    title: 'Simple Content Access',
    url: 'https://access.redhat.com/articles/simple-content-access',
    bundleTags: ['subscriptions-services'],
  },
  {
    id: 'kb-subscriptions-2',
    title: 'Transition of subscription services to the Hybrid Cloud Console',
    url: 'https://access.redhat.com/articles/transition_subscription_services',
    bundleTags: ['subscriptions-services'],
  },
  // Settings articles
  {
    id: 'kb-settings-1',
    title: 'Azure cloud integrations on Hybrid Cloud Console',
    url: 'https://access.redhat.com/articles/6961606',
    bundleTags: ['settings'],
  },
  {
    id: 'kb-settings-2',
    title: 'Configuring Notification Preferences',
    url: 'https://access.redhat.com/articles/4234567',
    bundleTags: ['settings'],
  },
];

const supportCasesFilterUrlProd =
  'https://api.access.redhat.com/support/v1/cases/filter';
const supportCasesFilterUrlStage =
  'https://api.access.stage.redhat.com/support/v1/cases/filter';

const emptySupportCasesResponse = () => HttpResponse.json({ cases: [] });

/**
 * MSW handlers for Support Panel - empty state (no open support cases).
 */
export const supportPanelMswHandlers = [
  http.post(supportCasesFilterUrlProd, emptySupportCasesResponse),
  http.post(supportCasesFilterUrlStage, emptySupportCasesResponse),
];

const mockSupportCases = [
  {
    id: 'case-1',
    caseNumber: '03012345',
    summary: 'Insights subscription activation issue',
    lastModifiedDate: new Date().toISOString(),
    status: 'Waiting on Red Hat',
  },
  {
    id: 'case-2',
    caseNumber: '03012346',
    summary: 'API rate limit clarification',
    lastModifiedDate: new Date(Date.now() - 86400000).toISOString(),
    status: 'Waiting on Customer',
  },
];

/**
 * MSW handlers for Support Panel - with cases (table and pagination).
 */
export const supportPanelMswHandlersWithCases = [
  http.post(supportCasesFilterUrlProd, () =>
    HttpResponse.json({ cases: mockSupportCases })
  ),
  http.post(supportCasesFilterUrlStage, () =>
    HttpResponse.json({ cases: mockSupportCases })
  ),
];

/**
 * Wait for the console page to load.
 * Verifies the Help button and header are present.
 */
export async function waitForPageLoad(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);

  // Wait for help button to be present (indicates page loaded)
  const helpButton = await canvas.findByRole(
    'button',
    { name: /toggle help panel/i },
    { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
  );
  await expect(helpButton).toBeInTheDocument();

  // Verify console header is present
  const header = canvas.getByText(/Red Hat Hybrid Cloud Console/i);
  await expect(header).toBeInTheDocument();

  console.log('UJ: ✅ Console page loaded successfully');
}

/**
 * Open the Help Panel drawer.
 * Checks if already open by looking for visible Learn tab.
 */
export async function openHelpPanel(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);

  // Check if the Learn tab is already visible (panel is open)
  const learnTab = canvas.queryByRole('tab', { name: /learn/i });
  if (learnTab) {
    console.log('UJ: ℹ️ Help panel already open');
    return;
  }

  // Wait for help button to be available
  const helpButton = await canvas.findByRole(
    'button',
    { name: /toggle help panel/i },
    { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
  );
  await expect(helpButton).toBeInTheDocument();

  // Click the Help button
  await userEvent.click(helpButton);

  // Wait for the Learn tab to be present and visible
  await waitFor(
    () => {
      const tab = canvas.getByRole('tab', { name: /learn/i });
      expect(tab).toBeVisible();
    },
    { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
  );

  // Pause to show drawer animation
  await delay(TEST_TIMEOUTS.AFTER_DRAWER_OPEN);

  console.log('UJ: ✅ Help panel opened successfully');
}

/**
 * Navigate to a specific tab in the Help Panel.
 * Opens the panel first if not already open.
 *
 * @param canvasElement - The Storybook canvas element
 * @param tabName - The name of the tab to navigate to (e.g., "Learn", "APIs", "Support")
 */
export async function navigateToTab(
  canvasElement: HTMLElement,
  tabName: string
) {
  const canvas = within(canvasElement);

  // Open help panel (will skip if already open)
  await openHelpPanel(canvasElement);

  // Find and click the tab
  const tab = await canvas.findByRole(
    'tab',
    { name: new RegExp(tabName, 'i') },
    { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
  );
  await expect(tab).toBeInTheDocument();
  await userEvent.click(tab);

  // Wait for tab to be selected
  await waitFor(
    () => {
      expect(tab).toHaveAttribute('aria-selected', 'true');
    },
    { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
  );

  // Pause to show tab content loading
  await delay(TEST_TIMEOUTS.AFTER_TAB_CHANGE);

  console.log(`UJ: ✅ Navigated to ${tabName} tab`);
}
