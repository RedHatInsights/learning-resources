import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import HelpPanelContent from './HelpPanelContent';

jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: () => true,
  useFlags: () => [
    { name: 'platform.chrome.help-panel_search', enabled: true },
    { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
    { name: 'platform.chrome.help-panel_chatbot', enabled: true },
  ],
}));

jest.mock('./HelpPanelCustomTabs', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const MockTabs = React.forwardRef((_props: unknown, _ref: unknown) => (
    <div data-testid="help-panel-custom-tabs">Help Panel Tabs</div>
  ));
  MockTabs.displayName = 'MockHelpPanelCustomTabs';
  return {
    __esModule: true,
    default: MockTabs,
  };
});

jest.mock('./HelpPanelCustomTabs.scss', () => ({}));

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" defaultLocale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('HelpPanelContent', () => {
  const mockToggleDrawer = jest.fn();

  beforeEach(() => {
    mockToggleDrawer.mockClear();
  });

  it('renders the full help panel with tabs', () => {
    renderWithIntl(<HelpPanelContent toggleDrawer={mockToggleDrawer} />);

    expect(screen.getByTestId('help-panel-custom-tabs')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('renders the status page link in header', () => {
    renderWithIntl(<HelpPanelContent toggleDrawer={mockToggleDrawer} />);

    const statusLink = screen.getByText('Red Hat status page');
    expect(statusLink).toBeInTheDocument();
    expect(statusLink.closest('a')).toHaveAttribute(
      'href',
      'https://status.redhat.com/'
    );
  });

  it('renders close button that calls toggleDrawer', () => {
    renderWithIntl(<HelpPanelContent toggleDrawer={mockToggleDrawer} />);

    const closeButton = document.querySelector(
      '[data-ouia-component-id="help-panel-close-button"]'
    );
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);
    expect(mockToggleDrawer).toHaveBeenCalledTimes(1);
  });
});
