import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React, { useState } from 'react';
import { IntlProvider } from 'react-intl';
import type { AllQuickStartStates } from '@patternfly/quickstarts';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import QuickStartsPanel from './QuickStartsPanel';
import type { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';

const MOCK_QS_NAME = 'story-qs-close-test';

const mockQuickStart: ExtendedQuickstart = {
  apiVersion: 'console.openshift.io/v1',
  kind: 'QuickStarts',
  metadata: {
    name: MOCK_QS_NAME,
    tags: [{ kind: 'bundle', value: 'insights' }],
  },
  spec: {
    version: 0.1,
    displayName: 'Storybook quickstart',
    icon: <span aria-hidden />,
    description: 'Used for Storybook interaction tests.',
    introduction: 'Welcome to this test quickstart.',
    type: { text: 'Quick start' },
    tasks: [
      {
        title: 'First task',
        description: 'Follow the steps.',
        review: {
          instructions: 'Did it work?',
          failedTaskHelp: 'Try again.',
        },
      },
    ],
  },
};

type HarnessProps = {
  loading?: boolean;
  onClose: (activeQuickStartStatus: string | number) => void;
  onCloseNotInProgress?: () => void;
};

const QuickStartsPanelHarness: React.FC<HarnessProps> = ({
  loading = false,
  onClose,
  onCloseNotInProgress,
}) => {
  const [allQuickStartStates, setAllQuickStartStates] =
    useState<AllQuickStartStates>({});

  return (
    <IntlProvider locale="en" defaultLocale="en">
      <div style={{ height: 700, width: 480 }}>
        <QuickStartsPanel
          activeQuickStartID={MOCK_QS_NAME}
          quickStarts={[mockQuickStart]}
          loading={loading}
          allQuickStartStates={allQuickStartStates}
          setAllQuickStartStates={setAllQuickStartStates}
          onClose={onClose}
          onCloseNotInProgress={onCloseNotInProgress}
        />
      </div>
    </IntlProvider>
  );
};

const meta: Meta<typeof QuickStartsPanelHarness> = {
  title: 'Components/Help Panel/Quick Starts Panel',
  component: QuickStartsPanelHarness,
  args: {
    onClose: fn(),
    onCloseNotInProgress: fn(),
  },
  render: (args) => <QuickStartsPanelHarness {...args} />,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(
        canvas.getByText('Storybook quickstart', { exact: false })
      ).toBeInTheDocument();
    });
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      await canvas.findByRole('progressbar', { name: /loading quickstart/i })
    ).toBeInTheDocument();
  },
};

/**
 * Clicking the drawer close control invokes `onClose` with the active quickstart status.
 */
export const DrawerCloseInvokesOnClose: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const onClose = args.onClose as ReturnType<typeof fn>;

    const closeBtn = await canvas.findByRole('button', {
      name: /close drawer panel/i,
    });
    await userEvent.click(closeBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  },
};
