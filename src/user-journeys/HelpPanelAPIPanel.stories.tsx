import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { AppEntryWithRouter } from './_shared/components/AppEntryWithRouter';
import {
  apiPanelJourneyMswHandlers,
  navigateToTab,
  openHelpPanel,
  waitForPageLoad,
} from './_shared/helpPanelJourneyHelpers';
import { TEST_TIMEOUTS, delay } from './_shared/testConstants';

/**
 * User Journey: Help Panel - APIs Panel
 *
 * Tests the API documentation discovery workflow.
 */

const TOTAL_API_DOCS = 15; // Updated to include 1 versioned notifications API (v1.0)

const meta: Meta<typeof AppEntryWithRouter> = {
  title: 'User Journeys/Help Panel/APIs Panel',
  component: AppEntryWithRouter,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: apiPanelJourneyMswHandlers,
    },
    docs: {
      description: {
        component: `
# Help Panel - APIs Panel User Journey

Tests the API documentation discovery workflow including:
- Opening the Help Panel
- Navigating to the APIs tab
- Viewing the API documentation list with service labels
- Toggling between All APIs and current bundle scope
- Navigating paginated results
- Verifying external links to API documentation
        `,
      },
    },
  },
  args: {
    initialRoute: '/',
    bundle: 'insights',
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
 * 03 / Navigate to APIs Tab
 */
export const Step03_NavigateToAPIsTab: Story = {
  name: '03 / Navigate to APIs Tab',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'APIs');

    await waitFor(
      () => {
        const description = canvas.getByText(
          /Browse the APIs for Hybrid Cloud Console services/i
        );
        expect(description).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    const catalogLink = canvas.getByText(/API Documentation Catalog/i);
    expect(catalogLink).toBeInTheDocument();
    expect(catalogLink.closest('a')).toHaveAttribute(
      'href',
      'https://console.redhat.com/docs/api'
    );

    console.log('UJ: ✅ APIs tab opened with description and catalog link');
  },
};

/**
 * 04 / View API Documentation List
 *
 * Verifies that API docs load into a data list with names and service labels.
 */
export const Step04_ViewAPIDocsList: Story = {
  name: '04 / View API Documentation List',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'APIs');

    // Wait for API data to load asynchronously
    await waitFor(
      () => {
        const advisorLink = canvas.queryByRole('button', { name: /Advisor/i });
        expect(advisorLink).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    await waitFor(
      () => {
        const countLabel = canvas.getByText(
          new RegExp(`API Documentation \\(${TOTAL_API_DOCS}\\)`)
        );
        expect(countLabel).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    const resourcesList = document.querySelector(
      '[data-ouia-component-id="help-panel-api-resources-list"]'
    );
    expect(resourcesList).toBeInTheDocument();

    const serviceLabels = canvas.getAllByText('RHEL');
    expect(serviceLabels.length).toBeGreaterThan(0);

    console.log('UJ: ✅ API documentation list loaded with service labels');
  },
};

/**
 * 05 / Navigate Pagination
 *
 * With 14 API docs at 10 per page, verifies page 2 shows the remaining items
 * and navigating back restores page 1.
 */
export const Step05_NavigatePagination: Story = {
  name: '05 / Navigate Pagination',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'APIs');

    await waitFor(
      () => {
        const pagination = document.querySelector(
          '[data-ouia-component-id="help-panel-api-pagination"]'
        );
        expect(pagination).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    const dataList = canvas.getByRole('list', { name: /API resources/i });
    const page1Items = within(dataList).getAllByRole('listitem');
    expect(page1Items).toHaveLength(10);

    const nextButton = canvas.getByRole('button', {
      name: /go to next page/i,
    });
    await userEvent.click(nextButton);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await waitFor(() => {
      const page2Items = within(dataList).getAllByRole('listitem');
      expect(page2Items).toHaveLength(TOTAL_API_DOCS - 10);
    });

    console.log('UJ: ✅ Navigated to page 2');

    const prevButton = canvas.getByRole('button', {
      name: /go to previous page/i,
    });
    await userEvent.click(prevButton);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    await waitFor(() => {
      const page1ItemsAgain = within(dataList).getAllByRole('listitem');
      expect(page1ItemsAgain).toHaveLength(10);
    });

    console.log('UJ: ✅ Navigated back to page 1');
  },
};

/**
 * 06 / Verify External Links
 *
 * Each API documentation entry should open in a new tab via window.open.
 * Verifies the link buttons are present and contain expected API names.
 */
export const Step06_VerifyExternalLinks: Story = {
  name: '06 / Verify External Links',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'APIs');

    await waitFor(
      () => {
        const advisorLink = canvas.getByRole('button', {
          name: /Advisor/i,
        });
        expect(advisorLink).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // First page shows 10 items (out of 15 total)
    // Includes the versioned Notifications API
    const expectedAPIs = [
      'Advisor',
      'Compliance',
      'Drift',
      'Inventory',
      'Malware Detection',
      'Notifications', // Versioned API (v1.0) - displayed as "Notifications v1.0"
      'Patch',
      'Policies',
      'Remediations',
      'Vulnerability',
    ];

    for (const apiName of expectedAPIs) {
      const link = canvas.getByRole('button', { name: new RegExp(apiName) });
      expect(link).toBeInTheDocument();
    }

    console.log('UJ: ✅ All expected API documentation links verified');
  },
};
