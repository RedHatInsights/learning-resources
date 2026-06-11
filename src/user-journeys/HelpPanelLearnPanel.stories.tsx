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
 * User Journey: Help Panel - Learn Panel
 *
 * Tests the complete user workflow for accessing and filtering learning resources.
 */

const meta: Meta<typeof AppEntryWithRouter> = {
  title: 'User Journeys/Help Panel/Learn Panel',
  component: AppEntryWithRouter,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: helpPanelMswHandlers,
    },
    docs: {
      description: {
        component: `
# Help Panel - Learn Panel User Journey

Tests the learning resources discovery workflow including:
- Opening the Help Panel
- Navigating to the Learn tab
- Filtering by content type
- Toggling bookmarked resources
- Switching between All resources and current bundle
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
 * 03 / Navigate to Learn Tab
 */
export const Step03_NavigateToLearnTab: Story = {
  name: '03 / Navigate to Learn Tab',
  play: async ({ canvasElement }) => {
    await navigateToTab(canvasElement, 'Learn');

    console.log('UJ: ✅ Learn tab opened');
  },
};

/**
 * 04 / Toggle Bundle Scope
 */
export const Step04_ToggleBundleScope: Story = {
  name: '04 / Toggle Bundle Scope',
  play: async ({ canvasElement }) => {
    await navigateToTab(canvasElement, 'Learn');

    // Find the "All" toggle button using ID
    const allToggle = document.getElementById('all-toggle');
    if (!allToggle) {
      throw new Error('All toggle button not found');
    }
    await userEvent.click(allToggle as HTMLElement);

    // Pause after toggle
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    console.log('UJ: ✅ Toggled to All resources scope');

    // Switch back to bundle using ID
    const bundleToggle = document.getElementById('bundle-toggle');
    if (!bundleToggle) {
      throw new Error('Bundle toggle button not found');
    }
    await userEvent.click(bundleToggle as HTMLElement);

    // Pause after toggle
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    console.log('UJ: ✅ Toggled back to current bundle scope');
  },
};

/**
 * 05 / Filter and Show Bookmarks Only
 */
export const Step05_FilterAndShowBookmarksOnly: Story = {
  name: '05 / Filter and Show Bookmarks Only',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Learn');

    // Find and click the content type dropdown
    const contentTypeToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(contentTypeToggle);

    // Pause after dropdown opens
    await delay(TEST_TIMEOUTS.AFTER_MENU_OPEN);

    // Wait for dropdown menu to appear and click "Quick start" checkbox
    await waitFor(() => {
      const option = document.querySelector(
        '[data-ouia-component-id="help-panel-content-type-option-quickstart"]'
      );
      expect(option).toBeInTheDocument();
    });

    // Find the checkbox input within the option
    const quickstartOption = document.querySelector(
      '[data-ouia-component-id="help-panel-content-type-option-quickstart"] input[type="checkbox"]'
    );
    if (!quickstartOption) {
      throw new Error('Quick start checkbox option not found');
    }
    await userEvent.click(quickstartOption as HTMLElement);

    // Pause after selecting filter
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify filter chip appears
    await waitFor(() => {
      const chip = canvasElement.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-quickstart"]'
      );
      expect(chip).toBeInTheDocument();
    });

    console.log('UJ: ✅ Filtered by Quick start content type');

    // Find and click the bookmarked only checkbox
    const bookmarkedCheckbox = canvas.getByRole('checkbox', {
      name: /bookmarked only/i,
    });
    await userEvent.click(bookmarkedCheckbox);

    // Pause after checkbox toggle
    await delay(TEST_TIMEOUTS.QUICK_SETTLE);

    // Verify checkbox is checked
    await expect(bookmarkedCheckbox).toBeChecked();

    console.log('UJ: ✅ Toggled bookmarked only filter');
  },
};

/**
 * 06 / Clear All Filters
 */
export const Step06_ClearAllFilters: Story = {
  name: '06 / Clear All Filters',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Learn');

    // Click content type dropdown
    const contentTypeToggle = await canvas.findByRole('button', {
      name: /content type/i,
    });
    await userEvent.click(contentTypeToggle);

    // Pause after dropdown opens
    await delay(TEST_TIMEOUTS.AFTER_MENU_OPEN);

    // Wait for dropdown menu to appear and click Documentation checkbox
    await waitFor(() => {
      const option = document.querySelector(
        '[data-ouia-component-id="help-panel-content-type-option-documentation"]'
      );
      expect(option).toBeInTheDocument();
    });

    const docOption = document.querySelector(
      '[data-ouia-component-id="help-panel-content-type-option-documentation"] input[type="checkbox"]'
    );
    if (!docOption) {
      throw new Error('Documentation checkbox option not found');
    }
    await userEvent.click(docOption as HTMLElement);

    // Pause after selecting filter
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Wait for filter chip to appear
    await waitFor(() => {
      const chip = canvasElement.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
      );
      expect(chip).toBeInTheDocument();
    });

    // Click "Clear all filters" button
    const clearButton = canvas.getByRole('button', {
      name: /clear all filters/i,
    });
    await userEvent.click(clearButton);

    // Pause after clearing filters
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify filter chip is removed
    await waitFor(() => {
      const chip = canvasElement.querySelector(
        '[data-ouia-component-id="help-panel-selected-chip-documentation"]'
      );
      expect(chip).not.toBeInTheDocument();
    });

    console.log('UJ: ✅ Cleared all filters');
  },
};
