import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import SupportPanel from './SupportPanel';
import { fetchSupportCases } from '../../../utils/fetchSupportCases';

jest.mock('../../../utils/fetchSupportCases');
jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: () => ({ auth: {}, getEnvironment: () => 'stage' }),
}));
const fetchCases = fetchSupportCases as jest.MockedFunction<
  typeof fetchSupportCases
>;
const renderPanel = () =>
  render(
    <IntlProvider locale="en">
      <SupportPanel />
    </IntlProvider>
  );
afterEach(() => jest.restoreAllMocks());
it('shows new status values and changes the visible page while preserving the total', async () => {
  fetchCases.mockResolvedValue(
    Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      caseNumber: `000${i}`,
      summary: `Case title ${i}`,
      lastModifiedById: '',
      lastModifiedDate: '',
      severity: '3 (Medium)',
      status: 'Waiting on Engineering',
    }))
  );
  renderPanel();
  expect(await screen.findByText('Case title 0')).toBeInTheDocument();
  expect(screen.getAllByText('Waiting on Engineering')).toHaveLength(20);
  expect(screen.queryByText('Case title 20')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /go to next page/i }));
  expect(await screen.findByText('Case title 20')).toBeInTheDocument();
  expect(screen.queryByText('Case title 0')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /25/ })).toBeInTheDocument();
});
it('renders an error rather than an empty state when access fails', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  fetchCases.mockRejectedValue(new Error('GraphQL failed'));
  renderPanel();
  expect(
    await screen.findByText(
      'Unable to load support cases. Please try again later.'
    )
  ).toBeInTheDocument();
  expect(screen.queryByText('No open support cases')).not.toBeInTheDocument();
});
