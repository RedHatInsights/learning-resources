import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { AppEntryWithRouter } from './_shared/components/AppEntryWithRouter';
import {
  helpPanelMswHandlers,
  navigateToTab,
  waitForPageLoad,
} from './_shared/helpPanelJourneyHelpers';
import { TEST_TIMEOUTS, delay } from './_shared/testConstants';

/**
 * User Journey: Help Panel - Feedback Panel
 *
 * Tests the user workflow for interacting with feedback forms in the Help Panel.
 *
 * KEY FEATURES DEMONSTRATED:
 * 1. Three distinct feedback workflows (Share Feedback, Report Bug, Research Opportunities)
 * 2. Email display when opting into research opportunities
 * 3. Form validation and required fields per workflow type
 * 4. Breadcrumb navigation between screens
 *
 * NOTE: Form submission and success screens cannot be tested in Storybook as they require
 * external API endpoints only available in production/stage environments.
 */

const meta: Meta<typeof AppEntryWithRouter> = {
  title: 'User Journeys/Help Panel/Feedback Panel',
  component: AppEntryWithRouter,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: helpPanelMswHandlers,
    },
    docs: {
      description: {
        component: `
# Help Panel - Feedback Panel User Journey

Tests the feedback form interactions including:
- Opening the Help Panel
- Navigating to the Feedback tab
- All three feedback workflows (Share Feedback, Report Bug, Research Opportunities)
- Email display when research checkbox is checked
- Breadcrumb navigation between workflow forms and home
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
 * Use this story to interact with the feedback panel UI. Note that form submission
 * requires external API endpoints and only works in production/stage environments.
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
 * 02 / Navigate to Feedback Tab
 */
export const Step02_NavigateToFeedbackTab: Story = {
  name: '02 / Navigate to Feedback Tab',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Feedback');

    // Verify feedback home page elements are visible
    await waitFor(
      () => {
        const title = canvas.getByText(/Tell us about your experience/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify all three feedback cards are present by their unique descriptions
    const shareFeedbackCard = canvas.getByText(
      /What has your console experience/i
    );
    const reportBugCard = canvas.getByText(/Describe the bug/i);
    const informDirectionCard = canvas.getByText(
      /Learn about opportunities to share your feedback/i
    );

    expect(shareFeedbackCard).toBeInTheDocument();
    expect(reportBugCard).toBeInTheDocument();
    expect(informDirectionCard).toBeInTheDocument();

    await delay(TEST_TIMEOUTS.AFTER_CLICK);
    console.log('UJ: ✅ Feedback tab opened with all three workflow cards');
  },
};

/**
 * 03 / Share Feedback Workflow
 */
export const Step03_ShareFeedbackWorkflow: Story = {
  name: '03 / Share Feedback Workflow',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Feedback');

    // Click the "Share feedback" card by its unique description
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify the form is displayed
    await waitFor(
      () => {
        const textarea = document.getElementById('feedback-description-text');
        expect(textarea).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Type feedback text
    const textarea = document.getElementById('feedback-description-text');
    if (!textarea) throw new Error('Textarea not found');
    await userEvent.type(
      textarea as HTMLElement,
      'This is my general feedback for the console.'
    );
    await delay(TEST_TIMEOUTS.QUICK_SETTLE);

    // Check the research opportunities checkbox
    const checkbox = document.getElementById('feedback-checkbox');
    if (!checkbox) throw new Error('Checkbox not found');
    await userEvent.click(checkbox as HTMLElement);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify email is displayed (shown in a raised panel)
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    console.log(
      'UJ: ✅ Share feedback form displayed and email shown when checkbox checked'
    );
  },
};

/**
 * 04 / Report Bug Workflow
 */
export const Step04_ReportBugWorkflow: Story = {
  name: '04 / Report Bug Workflow',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Feedback');

    // Click the "Report a bug" card by its unique description
    const reportBugCard = await canvas.findByText(/Describe the bug/i);
    await userEvent.click(reportBugCard);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify the form is displayed with bug-specific text
    await waitFor(
      () => {
        const breadcrumb = document.querySelector('.pf-v6-c-breadcrumb__item');
        expect(breadcrumb).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Type bug description
    const textarea = document.getElementById('feedback-description-text');
    if (!textarea) throw new Error('Textarea not found');
    await userEvent.type(
      textarea as HTMLElement,
      'The dashboard is not loading when I navigate to it.'
    );
    await delay(TEST_TIMEOUTS.QUICK_SETTLE);

    // Check the research opportunities checkbox
    const checkbox = document.getElementById('feedback-checkbox');
    if (!checkbox) throw new Error('Checkbox not found');
    await userEvent.click(checkbox as HTMLElement);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify email is displayed (shown in a raised panel)
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Navigate back to home
    const backButtons = canvas.getAllByRole('button', { name: /back/i });
    await userEvent.click(backButtons[0]);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify we're back at the feedback home
    await waitFor(
      () => {
        const title = canvas.getByText(/Tell us about your experience/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Report bug workflow and navigation back to home');
  },
};

/**
 * 05 / Research Opportunities Workflow
 */
export const Step05_ResearchOpportunitiesWorkflow: Story = {
  name: '05 / Research Opportunities Workflow',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Feedback');

    // Click the "Inform Red Hat direction" card by its unique description
    const informDirectionCard = await canvas.findByText(
      /Learn about opportunities to share your feedback/i
    );
    await userEvent.click(informDirectionCard);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify the form is displayed by checking for breadcrumb
    await waitFor(
      () => {
        const breadcrumb = document.querySelector('.pf-v6-c-breadcrumb__item');
        expect(breadcrumb).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify textarea is not shown (textAreaHidden is true for this workflow)
    const textarea = document.getElementById('feedback-description-text');
    expect(textarea).not.toBeInTheDocument();

    // Verify checkbox is required for this workflow
    const submitButton = canvas.getByRole('button', {
      name: /join mailing list/i,
    });
    expect(submitButton).toBeDisabled();

    // Check the checkbox
    const checkbox = document.getElementById('feedback-checkbox');
    if (!checkbox) throw new Error('Checkbox not found');
    await userEvent.click(checkbox as HTMLElement);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify submit button is now enabled
    expect(submitButton).toBeEnabled();

    // Verify email is displayed (shown in a raised panel)
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    console.log(
      'UJ: ✅ Research opportunities workflow (no textarea, checkbox required, email shown)'
    );
  },
};

/**
 * 06 / Breadcrumb Navigation
 */
export const Step06_BreadcrumbNavigation: Story = {
  name: '06 / Breadcrumb Navigation',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Feedback');

    // Navigate to a workflow by clicking its description
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Wait for breadcrumb to appear
    await waitFor(
      () => {
        const breadcrumbLink = document.querySelector(
          '.pf-v6-c-breadcrumb__item'
        );
        expect(breadcrumbLink).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click the breadcrumb to go back to home
    const breadcrumbLink = document.querySelector('.feedback-breadcrumb-link');

    if (breadcrumbLink) {
      await userEvent.click(breadcrumbLink as HTMLElement);
      await delay(TEST_TIMEOUTS.AFTER_CLICK);

      // Verify we're back at home
      await waitFor(
        () => {
          const title = canvas.getByText(/Tell us about your experience/i);
          expect(title).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      console.log('UJ: ✅ Breadcrumb navigation back to feedback home');
    }
  },
};

/**
 * 07 / Email Display Toggle
 */
export const Step07_EmailDisplayToggle: Story = {
  name: '07 / Email Display Toggle',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await navigateToTab(canvasElement, 'Feedback');

    // Navigate to Share Feedback workflow by clicking its description
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify email is NOT initially displayed
    const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
    expect(emailPanel).not.toBeInTheDocument();

    // Check the research opportunities checkbox
    const checkbox = document.getElementById('feedback-checkbox');
    if (!checkbox) throw new Error('Checkbox not found');
    await userEvent.click(checkbox as HTMLElement);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify email IS now displayed (shown in a raised panel)
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Email display before checkbox checked');

    // Uncheck the checkbox
    await userEvent.click(checkbox);
    await delay(TEST_TIMEOUTS.AFTER_CLICK);

    // Verify email is hidden again
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    console.log('UJ: ✅ Email hidden after checkbox unchecked');
  },
};
