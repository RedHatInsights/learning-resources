/**
 * Unit tests for HelpPanel styling work (semantic tokens, layout hooks).
 * Ensures the component keeps the class names and data attributes that
 * HelpPanelCustomTabs.scss and layout depend on.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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
