import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { HttpResponse, http } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import FeedbackPanel from './FeedbackPanel';

/**
 * Wrapper to provide IntlProvider (component uses useIntl).
 * Chrome is already mocked globally in Storybook.
 */
const FeedbackPanelWrapper = () => (
  <IntlProvider locale="en" defaultLocale="en">
    <div style={{ height: '600px', width: '400px' }}>
      <FeedbackPanel setNewActionTitle={() => {}} />
    </div>
  </IntlProvider>
);

/**
 * MSW handler for feedback submission API
 */
const mockFeedbackSubmissionHandler = http.post(
  '*/api/platform-feedback/v1/issues',
  async () => {
    return HttpResponse.json({ success: true }, { status: 201 });
  }
);

const meta: Meta<typeof FeedbackPanelWrapper> = {
  title: 'Components/Help Panel/Feedback Panel',
  component: FeedbackPanelWrapper,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [mockFeedbackSubmissionHandler],
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default view showing the three feedback workflow cards.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify the main title is present
    await waitFor(
      () => {
        const title = canvas.getByText(/Tell us about your experience/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify all three feedback cards are present
    expect(
      canvas.getByText(/What has your console experience/i)
    ).toBeInTheDocument();
    expect(canvas.getByText(/Describe the bug/i)).toBeInTheDocument();
    expect(
      canvas.getByText(/Learn about opportunities to share your feedback/i)
    ).toBeInTheDocument();
  },
};

/**
 * Test selecting the "Share Feedback" workflow.
 */
export const SelectShareFeedbackWorkflow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the Share Feedback card
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);

    // Verify the form is displayed
    await waitFor(
      () => {
        const textarea = document.getElementById('feedback-description-text');
        expect(textarea).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify the breadcrumb is present
    const breadcrumb = canvas.getByText(/Share feedback/i);
    expect(breadcrumb).toBeInTheDocument();
  },
};

/**
 * Test selecting the "Report a Bug" workflow.
 */
export const SelectReportBugWorkflow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the Report Bug card
    const reportBugCard = await canvas.findByText(/Describe the bug/i);
    await userEvent.click(reportBugCard);

    // Verify the form is displayed
    await waitFor(
      () => {
        const textarea = document.getElementById('feedback-description-text');
        expect(textarea).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify the breadcrumb is present
    const breadcrumb = canvas.getByText(/Report a bug/i);
    expect(breadcrumb).toBeInTheDocument();
  },
};

/**
 * Test selecting the "Inform the direction of Red Hat" workflow.
 */
export const SelectResearchOpportunitiesWorkflow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the Inform Direction card
    const informDirectionCard = await canvas.findByText(
      /Learn about opportunities to share your feedback/i
    );
    await userEvent.click(informDirectionCard);

    // Verify the form is displayed (no textarea for this workflow)
    await waitFor(
      () => {
        const breadcrumb = canvas.getByText(/Inform the direction of Red Hat/i);
        expect(breadcrumb).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify textarea is NOT shown (textAreaHidden is true for this workflow)
    const textarea = document.getElementById('feedback-description-text');
    expect(textarea).not.toBeInTheDocument();

    // Verify checkbox is present
    const checkbox = document.getElementById('feedback-checkbox');
    expect(checkbox).toBeInTheDocument();
  },
};

/**
 * Test clicking breadcrumb to navigate back to home.
 */
export const BreadcrumbNavigationToHome: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to Share Feedback workflow
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);

    // Wait for form to load
    await waitFor(
      () => {
        const breadcrumbLink = document.querySelector(
          '.feedback-breadcrumb-link'
        );
        expect(breadcrumbLink).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click the breadcrumb to go back
    const breadcrumbLink = document.querySelector(
      '.feedback-breadcrumb-link'
    ) as HTMLElement;
    await userEvent.click(breadcrumbLink);

    // Verify we're back at home
    await waitFor(
      () => {
        const title = canvas.getByText(/Tell us about your experience/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test email checkbox display toggle.
 */
export const EmailCheckboxToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to Share Feedback workflow
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);

    // Wait for form to load
    await waitFor(
      () => {
        const checkbox = document.getElementById('feedback-checkbox');
        expect(checkbox).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify email panel is NOT initially displayed
    const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
    expect(emailPanel).not.toBeInTheDocument();

    // Check the checkbox
    const checkbox = document.getElementById(
      'feedback-checkbox'
    ) as HTMLElement;
    await userEvent.click(checkbox);

    // Verify email panel IS now displayed
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Uncheck the checkbox
    await userEvent.click(checkbox);

    // Verify email panel is hidden again
    await waitFor(
      () => {
        const emailPanel = document.querySelector('.pf-v6-c-panel.pf-m-raised');
        expect(emailPanel).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test using Back button to return to home.
 */
export const BackButtonNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to Report Bug workflow
    const reportBugCard = await canvas.findByText(/Describe the bug/i);
    await userEvent.click(reportBugCard);

    // Wait for form to load
    await waitFor(
      () => {
        const textarea = document.getElementById('feedback-description-text');
        expect(textarea).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click the Back button (use getAllByRole and take the first one)
    const backButtons = canvas.getAllByRole('button', { name: /back/i });
    await userEvent.click(backButtons[0]);

    // Verify we're back at home
    await waitFor(
      () => {
        const title = canvas.getByText(/Tell us about your experience/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test form validation - Submit button disabled without feedback text.
 */
export const FormValidationShareFeedback: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to Share Feedback workflow
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);

    // Wait for form to load
    await waitFor(
      () => {
        const submitButton = canvas.getByRole('button', {
          name: /submit feedback/i,
        });
        expect(submitButton).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify submit button is disabled (no text entered)
    const submitButton = canvas.getByRole('button', {
      name: /submit feedback/i,
    });
    expect(submitButton).toBeDisabled();

    // Type some feedback
    const textarea = document.getElementById(
      'feedback-description-text'
    ) as HTMLElement;
    await userEvent.type(textarea, 'This is my feedback.');

    // Verify submit button is now enabled
    await waitFor(
      () => {
        expect(submitButton).toBeEnabled();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test form validation - Research workflow requires checkbox.
 */
export const FormValidationResearchOpportunities: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to Research Opportunities workflow
    const informDirectionCard = await canvas.findByText(
      /Learn about opportunities to share your feedback/i
    );
    await userEvent.click(informDirectionCard);

    // Wait for form to load
    await waitFor(
      () => {
        const submitButton = canvas.getByRole('button', {
          name: /join mailing list/i,
        });
        expect(submitButton).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify submit button is disabled (checkbox not checked)
    const submitButton = canvas.getByRole('button', {
      name: /join mailing list/i,
    });
    expect(submitButton).toBeDisabled();

    // Check the checkbox
    const checkbox = document.getElementById(
      'feedback-checkbox'
    ) as HTMLElement;
    await userEvent.click(checkbox);

    // Verify submit button is now enabled
    await waitFor(
      () => {
        expect(submitButton).toBeEnabled();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Test multiple workflow navigation without submission.
 * Demonstrates navigating between different workflows using breadcrumbs.
 */
export const NavigateBetweenWorkflows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Navigate to Share Feedback
    const shareFeedbackCard = await canvas.findByText(
      /What has your console experience/i
    );
    await userEvent.click(shareFeedbackCard);

    await waitFor(
      () => {
        const breadcrumb = canvas.getByText(/Share feedback/i);
        expect(breadcrumb).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Go back to home via breadcrumb
    const breadcrumbLink = document.querySelector(
      '.feedback-breadcrumb-link'
    ) as HTMLElement;
    await userEvent.click(breadcrumbLink);

    // Verify we're at home
    await waitFor(
      () => {
        const title = canvas.getByText(/Tell us about your experience/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Navigate to Report Bug
    const reportBugCard = await canvas.findByText(/Describe the bug/i);
    await userEvent.click(reportBugCard);

    // Verify Report Bug form
    await waitFor(
      () => {
        const breadcrumb = canvas.getByText(/Report a bug/i);
        expect(breadcrumb).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};
