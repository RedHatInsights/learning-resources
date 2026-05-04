import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import HelpPanelContent from './HelpPanelContent';

const mockUseFlag = jest.fn();

jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: (flagName: string) => mockUseFlag(flagName),
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
    mockUseFlag.mockReset();
  });

  describe('when environment flag is enabled', () => {
    beforeEach(() => {
      mockUseFlag.mockImplementation((flagName: string) => {
        if (flagName === 'platform.learning-resources.environment.enabled')
          return true;
        if (flagName === 'platform.chrome.help-panel_chatbot') return true;
        if (flagName === 'platform.chrome.help-panel_search') return true;
        return true;
      });
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

  describe('when environment flag is disabled', () => {
    beforeEach(() => {
      mockUseFlag.mockImplementation((flagName: string) => {
        if (flagName === 'platform.learning-resources.environment.enabled')
          return false;
        if (flagName === 'platform.chrome.help-panel_chatbot') return true;
        return true;
      });
    });

    it('renders the not-available fallback instead of tabs', () => {
      renderWithIntl(<HelpPanelContent toggleDrawer={mockToggleDrawer} />);

      expect(
        screen.queryByTestId('help-panel-custom-tabs')
      ).not.toBeInTheDocument();

      const notAvailable = document.querySelector(
        '[data-ouia-component-id="help-panel-not-available"]'
      );
      expect(notAvailable).toBeInTheDocument();
    });

    it('renders the Help title without the status page header link', () => {
      renderWithIntl(<HelpPanelContent toggleDrawer={mockToggleDrawer} />);

      expect(screen.getByText('Help')).toBeInTheDocument();

      const headerStatusLink = document.querySelector(
        '[data-ouia-component-id="help-panel-status-page-header-button"]'
      );
      expect(headerStatusLink).not.toBeInTheDocument();
    });

    it('renders a status page link in the fallback message', () => {
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
});
