import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { HttpResponse, delay, http } from 'msw';
import { expect, waitFor, within } from 'storybook/test';
import SupportPanel from './SupportPanel';
import {
  supportPanelMswHandlers,
  supportPanelMswHandlersWithCases,
} from '../../../user-journeys/_shared/helpPanelJourneyHelpers';

const supportCasesFilterUrlStage =
  'https://api.access.stage.redhat.com/support/v1/cases/filter';

/**
 * Wrapper to provide IntlProvider (component uses useIntl and Messages).
 * Chrome is already mocked globally in Storybook.
 */
const SupportPanelWrapper = () => (
  <IntlProvider locale="en" defaultLocale="en">
    <div style={{ height: '500px', width: '400px' }}>
      <SupportPanel />
    </div>
  </IntlProvider>
);

const meta: Meta<typeof SupportPanelWrapper> = {
  title: 'Components/Help Panel/Support Panel',
  component: SupportPanelWrapper,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: supportPanelMswHandlers,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Empty state when user has no open support cases.
 */
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const emptyState = document.querySelector(
          '[data-ouia-component-id="help-panel-support-empty-state"]'
        );
        expect(emptyState).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(canvas.getByText('No open support cases')).toBeInTheDocument();
    expect(
      canvas.getByRole('button', { name: /open a support case/i })
    ).toBeInTheDocument();
  },
};

/**
 * Loading state: skeleton table while fetch is in progress.
 */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(supportCasesFilterUrlStage, async () => {
          await delay(2000);
          return HttpResponse.json({ cases: [] });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initially loading: SkeletonTable has no specific role; check for table-like structure or wait for it to disappear
    await waitFor(
      () => {
        const emptyState = document.querySelector(
          '[data-ouia-component-id="help-panel-support-empty-state"]'
        );
        expect(emptyState).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    expect(canvas.getByText('No open support cases')).toBeInTheDocument();
  },
};

/**
 * Table view when user has open support cases (both status types).
 */
export const WithCases: Story = {
  parameters: {
    msw: {
      handlers: supportPanelMswHandlersWithCases,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const table = document.querySelector(
          '[data-ouia-component-id="help-panel-support-cases-table"]'
        );
        expect(table).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(canvas.getByText(/Customer Portal/)).toBeInTheDocument();
    expect(
      canvas.getByRole('heading', { name: /My open support cases \(21\)/ })
    ).toBeInTheDocument();
    expect(
      canvas.getByText('Insights subscription activation issue')
    ).toBeInTheDocument();
    expect(
      canvas.getByText('API rate limit clarification')
    ).toBeInTheDocument();
    expect(canvas.getAllByText('Waiting on Red Hat').length).toBeGreaterThan(0);
    expect(canvas.getAllByText('Waiting on Customer').length).toBeGreaterThan(
      0
    );

    const pagination = document.querySelector(
      '[data-ouia-component-id="help-panel-support-pagination"]'
    );
    expect(pagination).toBeInTheDocument();
  },
};

/**
 * Pagination with many cases (multiple pages).
 */
const manyCases = Array.from({ length: 25 }, (_, i) => ({
  id: `case-${i + 1}`,
  caseNumber: `0301234${i}`,
  summary: `Support case ${i + 1} summary`,
  lastModifiedDate: new Date(Date.now() - i * 86400000).toISOString(),
  status: i % 2 === 0 ? 'Waiting on Red Hat' : 'Waiting on Customer',
}));

export const WithCasesPagination: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(supportCasesFilterUrlStage, () =>
          HttpResponse.json({ cases: manyCases })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const table = document.querySelector(
          '[data-ouia-component-id="help-panel-support-cases-table"]'
        );
        expect(table).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const pagination = document.querySelector(
      '[data-ouia-component-id="help-panel-support-pagination"]'
    );
    expect(pagination).toBeInTheDocument();

    expect(
      canvas.getByRole('heading', { name: /My open support cases \(25\)/ })
    ).toBeInTheDocument();

    // First page: first case visible
    expect(canvas.getByText('Support case 1 summary')).toBeInTheDocument();
  },
};

/**
 * API error: component shows empty state after failed fetch.
 */
export const ApiError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(supportCasesFilterUrlStage, () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      () => {
        const emptyState = document.querySelector(
          '[data-ouia-component-id="help-panel-support-empty-state"]'
        );
        expect(emptyState).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(canvas.getByText('No open support cases')).toBeInTheDocument();
    expect(
      canvas.getByRole('button', { name: /open a support case/i })
    ).toBeInTheDocument();
  },
};
