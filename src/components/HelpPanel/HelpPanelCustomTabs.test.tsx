/**
 * Unit tests for HelpPanel styling work (semantic tokens, layout hooks)
 * and UI interactions (sub-tabs, add/close tabs).
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import HelpPanelCustomTabs from './HelpPanelCustomTabs';

jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: () => true,
  useFlags: () => [
    { name: 'platform.chrome.help-panel_search', enabled: true },
    { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
  ],
}));

// Avoid loading real panel modules (Learn, API, Search, etc.) which depend on chrome and other globals.
jest.mock('./HelpPanelTabs/helpPanelTabsMapper', () => ({
  __esModule: true,
  TabType: {
    search: 'search',
    learn: 'learn',
    kb: 'kb',
    api: 'api',
    support: 'support',
    va: 'va',
  },
  default: {},
}));

jest.mock('./HelpPanelTabs/HelpPanelTabContainer', () => {
  return function MockHelpPanelTabContainer() {
    return (
      <div data-ouia-component-id="help-panel-content-container">
        Panel content
      </div>
    );
  };
});

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" defaultLocale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('HelpPanelCustomTabs styling hooks', () => {
  it('renders root with class lr-c-help-panel-custom-tabs used by SCSS', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const root = document.querySelector('.lr-c-help-panel-custom-tabs');
    expect(root).toBeInTheDocument();
  });

  it('renders subtabs container with data-ouia-component-id for styling and a11y', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const subtabs = document.querySelector(
      '[data-ouia-component-id="help-panel-subtabs"]'
    );
    expect(subtabs).toBeInTheDocument();
  });

  it('renders content container with data-ouia-component-id used by SCSS', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    expect(
      screen
        .getByText('Panel content')
        .closest('[data-ouia-component-id="help-panel-content-container"]')
    ).toBeInTheDocument();
  });

  it('renders main tabs with data-ouia-component-id help-panel-tabs', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const tabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    );
    expect(tabs).toBeInTheDocument();
  });

  it('shows Find help as default tab', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    expect(screen.getByText('Find help')).toBeInTheDocument();
  });
});

describe('HelpPanelCustomTabs UI interactions', () => {
  it('switches sub-tab when clicking Learn', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const subtabsContainer = document.querySelector(
      '[data-ouia-component-id="help-panel-subtabs"]'
    ) as HTMLElement;
    expect(subtabsContainer).toBeInTheDocument();

    const learnTab = within(subtabsContainer).getByRole('tab', {
      name: /learn/i,
    });
    fireEvent.click(learnTab);

    // Content container still shows (mock always renders "Panel content")
    expect(screen.getByText('Panel content')).toBeInTheDocument();
    // Learn tab is selected (PatternFly sets aria-selected on the tab)
    expect(learnTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches sub-tab when clicking APIs', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const subtabsContainer = document.querySelector(
      '[data-ouia-component-id="help-panel-subtabs"]'
    ) as HTMLElement;
    const apisTab = within(subtabsContainer).getByRole('tab', {
      name: /apis/i,
    });
    fireEvent.click(apisTab);

    expect(apisTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('adds a new tab when clicking Add tab button', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const addTabButton = screen.getByRole('button', { name: /add tab/i });
    fireEvent.click(addTabButton);

    // New tab placeholder appears; main tabs now include "New tab"
    expect(screen.getByText('New tab')).toBeInTheDocument();
    // Two main tabs: "Find help" and "New tab"
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0]).toHaveTextContent('Find help');
    expect(tabs[1]).toHaveTextContent('New tab');
  });

  it('closes an added tab when clicking its close button', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    fireEvent.click(screen.getByRole('button', { name: /add tab/i }));

    expect(screen.getByText('New tab')).toBeInTheDocument();

    // Two Close tab buttons exist (Find help has disabled, New tab has enabled); click the enabled one
    const closeButtons = screen.getAllByRole('button', { name: /close tab/i });
    const closeNewTab = closeButtons.find(
      (btn) => !(btn as HTMLButtonElement).disabled
    );
    expect(closeNewTab).toBeDefined();
    fireEvent.click(closeNewTab!);

    // "New tab" is removed; only "Find help" remains
    expect(screen.queryByText('New tab')).not.toBeInTheDocument();
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');
    expect(tabs.length).toBe(1);
    expect(tabs[0]).toHaveTextContent('Find help');
  });
});
