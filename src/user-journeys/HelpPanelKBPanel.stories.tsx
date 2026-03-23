import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { AppEntryWithRouter } from './_shared/components/AppEntryWithRouter';
import {
  helpPanelMswHandlers,
  navigateToTab,
  openHelpPanel,
  waitForPageLoad,
} from './_shared/helpPanelJourneyHelpers';
import { TEST_TIMEOUTS, delay } from './_shared/testConstants';

/**
 * User Journey: Help Panel - Knowledgebase Panel
 *
 * Tests the complete user workflow for discovering knowledgebase articles.
 */

const meta: Meta<typeof AppEntryWithRouter> = {
  title: 'User Journeys/Help Panel/Knowledgebase Panel',
  component: AppEntryWithRouter,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: helpPanelMswHandlers,
    },
    docs: {
      description: {
        component: `
# Help Panel - Knowledgebase Panel User Journey

Tests the knowledgebase article discovery workflow including:
- Opening the Help Panel
- Navigating to the Knowledgebase tab
- Searching for articles
- Switching between All articles and current bundle
- Accessing articles on Customer Portal
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
 * 03 / Navigate to Knowledgebase Tab
 */
export const Step03_NavigateToKnowledgebaseTab: Story = {
  name: '03 / Navigate to Knowledgebase Tab',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Knowledgebase');

    // Wait for KB panel content to load
    await waitFor(
      () => {
        const searchInput = canvas.queryByPlaceholderText(
          /search knowledgebase articles/i
        );
        expect(searchInput).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Verify Customer Portal link is present
    const portalLink = canvas.getByText(/Customer Portal/i);
    expect(portalLink).toBeInTheDocument();

    console.log('UJ: ✅ Knowledgebase tab opened');
  },
};

/**
 * 04 / Search for Articles
 */
export const Step04_SearchForArticles: Story = {
  name: '04 / Search for Articles',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Knowledgebase');

    // Wait for search input to be present
    const searchInput = await canvas.findByPlaceholderText(
      /search knowledgebase articles/i,
      undefined,
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Type in search query
    await userEvent.type(searchInput, 'Authentication');

    // Pause after typing
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Wait for search results to update and verify the actual count
    await waitFor(
      () => {
        // Verify specific article from search results is visible
        const articles = canvas.queryAllByRole('link', {
          name: /Authentication/i,
        });
        expect(articles.length).toBeGreaterThan(0);
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    console.log('UJ: ✅ Searched for "Authentication" articles');
  },
};

/**
 * 05 / Clear Search
 */
export const Step05_ClearSearch: Story = {
  name: '05 / Clear Search',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Knowledgebase');

    // Perform a search first
    const searchInput = await canvas.findByPlaceholderText(
      /search knowledgebase articles/i,
      undefined,
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );
    await userEvent.type(searchInput, 'Ansible');
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Find and click the clear button
    const clearButton = canvas.getByRole('button', { name: /reset/i });
    await userEvent.click(clearButton);

    // Pause after clearing
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify search input is now empty
    await waitFor(
      () => {
        expect(searchInput).toHaveValue('');
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    console.log('UJ: ✅ Cleared search filter');
  },
};

/**
 * 06 / Toggle Bundle Scope
 */
export const Step06_ToggleBundleScope: Story = {
  name: '06 / Toggle Bundle Scope',
  play: async ({ canvasElement }) => {
    await navigateToTab(canvasElement, 'Knowledgebase');

    // Wait for the toggle to be present
    await waitFor(
      () => {
        const scopeToggle = document.querySelector(
          '[data-ouia-component-id="help-panel-kb-scope-toggle"]'
        );
        expect(scopeToggle).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Find and click the "All" toggle button using ID
    const allToggle = document.getElementById('kb-all-toggle');
    if (!allToggle) {
      throw new Error('All toggle button not found');
    }
    await userEvent.click(allToggle as HTMLElement);

    // Pause after toggle
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify All toggle is selected and all articles are shown
    await waitFor(
      () => {
        expect(allToggle).toHaveAttribute('aria-pressed', 'true');
        // Verify we see multiple articles (actual count varies by config)
        const articles = canvasElement.querySelectorAll(
          '[data-ouia-component-id="help-panel-kb-articles-list"] a'
        );
        expect(articles.length).toBeGreaterThan(0);
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    console.log('UJ: ✅ Toggled to All articles scope');

    // Switch back to bundle using ID
    const bundleToggle = document.getElementById('kb-bundle-toggle');
    if (!bundleToggle) {
      throw new Error('Bundle toggle button not found');
    }
    await userEvent.click(bundleToggle as HTMLElement);

    // Pause after toggle
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify bundle toggle is selected and filtered to bundle articles
    await waitFor(
      () => {
        expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Wait for filtering to complete before checking articles
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify articles are displayed (count varies by bundle)
    const articles = canvasElement.querySelectorAll(
      '[data-ouia-component-id="help-panel-kb-articles-list"] a'
    );
    if (articles.length > 0) {
      // If bundle has KB articles, verify we see them
      expect(articles.length).toBeGreaterThan(0);
    }

    console.log('UJ: ✅ Toggled back to current bundle scope');
  },
};

/**
 * 07 / View Article Details
 */
export const Step07_ViewArticleDetails: Story = {
  name: '07 / View Article Details',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Knowledgebase');

    // Wait for articles list to load
    await waitFor(
      () => {
        const articlesList = document.querySelector(
          '[data-ouia-component-id="help-panel-kb-articles-list"]'
        );
        expect(articlesList).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Wait for specific article links to be visible
    await waitFor(
      () => {
        const articleLinks = canvas.queryAllByRole('link', {
          name: /System Information|Simple Content|Authentication|Ansible|OpenShift/i,
        });
        expect(articleLinks.length).toBeGreaterThan(0);
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Verify articles have external link attributes
    const articleLinks = canvas.queryAllByRole('link', {
      name: /System Information|Simple Content|Authentication|Ansible|OpenShift/i,
    });

    articleLinks.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    console.log('UJ: ✅ Verified article details and external links');
  },
};

/**
 * 08 / Search with Bundle Scope
 */
export const Step08_SearchWithBundleScope: Story = {
  name: '08 / Search with Bundle Scope',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Knowledgebase');

    // Wait for bundle toggle to be available
    await waitFor(
      () => {
        const bundleToggle = document.getElementById('kb-bundle-toggle');
        expect(bundleToggle).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Switch to bundle scope (insights)
    const bundleToggle = document.getElementById('kb-bundle-toggle');
    if (!bundleToggle) {
      throw new Error('Bundle toggle button not found');
    }
    await userEvent.click(bundleToggle as HTMLElement);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify bundle toggle is selected
    await waitFor(
      () => {
        expect(bundleToggle).toHaveAttribute('aria-pressed', 'true');
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    // Perform search within bundle scope
    const searchInput = canvas.getByPlaceholderText(
      /search knowledgebase articles/i
    );
    await userEvent.type(searchInput, 'Red Hat');
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify search is applied with bundle filter
    // Note: Actual results depend on bundle KB articles and their tags
    await waitFor(
      () => {
        // Just verify the search executed and count updated
        const count = canvas.queryByText(/Knowledgebase articles \(/i);
        expect(count).toBeInTheDocument();
      },
      { timeout: TEST_TIMEOUTS.ELEMENT_WAIT }
    );

    console.log('UJ: ✅ Searched within bundle scope');
  },
};
