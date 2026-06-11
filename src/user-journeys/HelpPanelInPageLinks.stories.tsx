import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { within } from 'storybook/test';
import { AppEntryWithLinks } from './_shared/components/AppEntryWithLinks';
import {
  helpPanelMswHandlers,
  supportPanelMswHandlers,
  waitForPageLoad,
} from './_shared/helpPanelJourneyHelpers';

/**
 * User Journey: Help Panel - In-Page Links
 *
 * Tests the complete user workflow for clicking in-page HelpPanelLink components
 * and verifying the help panel opens with the correct tab and content.
 *
 * This verifies that links embedded in console pages correctly trigger the
 * help panel drawer and navigate to the appropriate tab (Learn, APIs, Support,
 * Knowledge Base, Feedback) or display custom content.
 */

const meta: Meta<typeof AppEntryWithLinks> = {
  title: 'User Journeys/Help Panel/In-Page Links',
  component: AppEntryWithLinks,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [...helpPanelMswHandlers, ...supportPanelMswHandlers],
    },
    docs: {
      description: {
        component: `
# Help Panel - In-Page Links User Journey

Tests the in-page link functionality where clicking a HelpPanelLink
in the console opens the help panel with specific content:

- Clicking a Learn link opens the Learn tab
- Clicking an API link opens the APIs tab
- Clicking a Support link opens the Support tab
- Clicking a link with custom content displays that content
- Clicking a Knowledge Base link opens the KB tab
- Clicking a Feedback link opens the Feedback tab
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
 *
 * Use this story to manually test in-page links.
 * Click any of the HelpPanelLink buttons on the page cards
 * and verify the help panel opens with the correct tab.
 */
export const ManualTesting: Story = {};

/**
 * 01 / Page Loads with In-Page Links
 *
 * Verifies the page loads with HelpPanelLink components visible in the cards.
 */
export const Step01_PageLoadsWithLinks: Story = {
  name: '01 / Page Loads with In-Page Links',
  play: async ({ canvasElement }) => {
    await waitForPageLoad(canvasElement);

    const canvas = within(canvasElement);

    // Verify HelpPanelLink buttons are present
    await canvas.findByRole('button', { name: /view getting started guide/i });
    await canvas.findByRole('button', { name: /view api documentation/i });
    await canvas.findByRole('button', { name: /get support/i });
    await canvas.findByRole('button', { name: /view feature help/i });
    await canvas.findByRole('button', { name: /browse knowledge base/i });
    await canvas.findByRole('button', { name: /give feedback/i });

    console.log('UJ: \u2705 Page loaded with all in-page link buttons visible');
  },
};
