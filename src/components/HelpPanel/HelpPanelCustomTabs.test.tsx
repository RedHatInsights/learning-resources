/**
 * Unit tests for HelpPanel styling work (semantic tokens, layout hooks)
 * and UI interactions (sub-tabs, add/close tabs).
 */
import React, { createRef } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import HelpPanelCustomTabs, {
  HelpPanelCustomTabsRef,
} from './HelpPanelCustomTabs';
import { TabType } from './HelpPanelTabs/helpPanelTabsMapper';

jest.mock('../../store/openQuickstartInHelpPanelStore', () => {
  const mockStore = {
    getState: () => ({ pendingOpen: null }),
    updateState: jest.fn(),
    subscribe: jest.fn(() => () => {}),
    subscribeAll: jest.fn(() => () => {}),
  };
  return {
    getOpenQuickstartInHelpPanelStore: () => mockStore,
  };
});

jest.mock('@scalprum/react-core', () => ({
  useGetState: (store: { getState: () => { pendingOpen: unknown } }) =>
    store.getState(),
}));

// Create a mock function that we can spy on
const mockUseFlag = jest.fn((flagName: string) => {
  // Enable VA flag for most tests to maintain existing behavior
  if (flagName === 'platform.chrome.help-panel_chatbot') return true;
  return true;
});

jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: (flagName: string) => mockUseFlag(flagName),
  useFlags: () => [
    { name: 'platform.chrome.help-panel_search', enabled: true },
    { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
    { name: 'platform.chrome.help-panel_chatbot', enabled: true },
  ],
}));

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: () => ({
    auth: { getUser: () => Promise.resolve(null) },
  }),
}));

jest.mock('../../utils/fetchQuickstarts', () => ({
  __esModule: true,
  default: () => Promise.resolve([]),
}));

jest.mock('@patternfly/quickstarts', () => ({
  QuickStartContainer: ({ children }: { children?: React.ReactNode }) =>
    children ?? null,
  QuickStartDrawerContent: () => null,
  QuickStartCloseModal: () => null,
  QuickStartStatus: { IN_PROGRESS: 1, NOT_STARTED: 0, COMPLETE: 2 },
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
    quickstart: 'quickstart',
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
    const contentContainers = screen.getAllByText('Panel content');
    expect(contentContainers.length).toBeGreaterThan(0);
    expect(
      contentContainers[0].closest(
        '[data-ouia-component-id="help-panel-content-container"]'
      )
    ).toBeInTheDocument();
  });

  it('renders main tabs with data-ouia-component-id help-panel-tabs', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const tabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    );
    expect(tabs).toBeInTheDocument();
  });

  it('shows Virtual Assistant and Find help tabs with Find help as default active', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    // VA tab should have an icon instead of text
    const vaTab = screen.getByRole('tab', { name: /virtual assistant/i });
    expect(vaTab).toBeInTheDocument();
    expect(screen.getByText('Find help')).toBeInTheDocument();

    // Find help should be the active tab (aria-selected="true")
    const findHelpTab = screen.getByRole('tab', { name: /find help/i });
    expect(findHelpTab).toHaveAttribute('aria-selected', 'true');
  });

  it('hides Virtual Assistant tab when chatbot feature flag is disabled', () => {
    // Override the mock to return false for VA flag
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_chatbot') return false;
      return true;
    });

    renderWithIntl(<HelpPanelCustomTabs />);

    // VA tab should not exist when feature flag is disabled
    const vaTab = screen.queryByRole('tab', { name: /virtual assistant/i });
    expect(vaTab).not.toBeInTheDocument();

    // Should still have Find help tab
    expect(screen.getByText('Find help')).toBeInTheDocument();

    // Restore original mock behavior
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      return true;
    });
  });

  it('hides Virtual Assistant tab when VA environment flag is disabled', () => {
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.va.environment.enabled') return false;
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      return true;
    });

    renderWithIntl(<HelpPanelCustomTabs />);

    const vaTab = screen.queryByRole('tab', { name: /virtual assistant/i });
    expect(vaTab).not.toBeInTheDocument();

    expect(screen.getByText('Find help')).toBeInTheDocument();

    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      return true;
    });
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
    const contentContainers = screen.getAllByText('Panel content');
    expect(contentContainers.length).toBeGreaterThan(0);
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
    const contentContainers = screen.getAllByText('Panel content');
    expect(contentContainers.length).toBeGreaterThan(0);
  });

  it('adds a new tab when clicking Add tab button', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const addTabButton = screen.getByRole('button', { name: /add tab/i });
    fireEvent.click(addTabButton);

    // New tab placeholder appears; main tabs now include "New tab"
    expect(screen.getByText('New tab')).toBeInTheDocument();
    // Three main tabs: "Virtual Assistant", "Find help", and "New tab"
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');
    expect(tabs.length).toBe(3);
    // First tab is VA tab with icon (no specific text content)
    expect(tabs[1]).toHaveTextContent('Find help');
    expect(tabs[2]).toHaveTextContent('New tab');
  });

  it('new tab defaults to Search sub-tab when search flag is enabled', async () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const addTabButton = screen.getByRole('button', { name: /add tab/i });
    fireEvent.click(addTabButton);

    // Click the new tab to make it active
    await waitFor(() => {
      const newTab = screen.getByText('New tab');
      expect(newTab).toBeInTheDocument();
      fireEvent.click(newTab);
    });

    // The new tab should have sub-tabs; the Search sub-tab should be active
    await waitFor(() => {
      // Find all sub-tab containers — there may be multiple (one per main tab)
      const subtabContainers = document.querySelectorAll(
        '[data-ouia-component-id="help-panel-subtabs"]'
      );
      // The last sub-tab container belongs to the newly added tab
      const lastSubtabs = subtabContainers[subtabContainers.length - 1];
      const searchSubTab = within(lastSubtabs as HTMLElement).getByRole('tab', {
        name: /search/i,
      });
      expect(searchSubTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('new tab defaults to Learn sub-tab when search flag is disabled', async () => {
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_search') return false;
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      return true;
    });

    renderWithIntl(<HelpPanelCustomTabs />);
    const addTabButton = screen.getByRole('button', { name: /add tab/i });
    fireEvent.click(addTabButton);

    await waitFor(() => {
      const newTab = screen.getByText('New tab');
      expect(newTab).toBeInTheDocument();
      fireEvent.click(newTab);
    });

    await waitFor(() => {
      const subtabContainers = document.querySelectorAll(
        '[data-ouia-component-id="help-panel-subtabs"]'
      );
      const lastSubtabs = subtabContainers[subtabContainers.length - 1];
      const learnSubTab = within(lastSubtabs as HTMLElement).getByRole('tab', {
        name: /learn/i,
      });
      expect(learnSubTab).toHaveAttribute('aria-selected', 'true');
    });

    // Restore default mock
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      return true;
    });
  });

  it('closes an added tab when clicking its close button', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    fireEvent.click(screen.getByRole('button', { name: /add tab/i }));

    expect(screen.getByText('New tab')).toBeInTheDocument();

    // Close tab buttons exist (Virtual Assistant and Find help have disabled, New tab has enabled); click the enabled one
    const closeButtons = screen.getAllByRole('button', { name: /close tab/i });
    const closeNewTab = closeButtons.find(
      (btn) => !(btn as HTMLButtonElement).disabled
    );
    expect(closeNewTab).toBeDefined();
    fireEvent.click(closeNewTab!);

    // "New tab" is removed; only permanent tabs remain
    expect(screen.queryByText('New tab')).not.toBeInTheDocument();
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');

    // Should have VA and Find help tabs (since VA flag is enabled in tests)
    expect(tabs.length).toBe(2);
    // First tab is VA tab with icon (no specific text content)
    expect(tabs[1]).toHaveTextContent('Find help');
  });
});

describe('HelpPanelCustomTabs ref API (openTabWithContent)', () => {
  it('exposes openTabWithContent method via ref', () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.openTabWithContent).toBeDefined();
    expect(typeof ref.current?.openTabWithContent).toBe('function');
  });

  it('opens a new tab with custom content when openTabWithContent is called', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    const customContent = <div>Custom tab content</div>;

    ref.current?.openTabWithContent({
      title: 'Custom Tab',
      tabType: TabType.learn,
      content: customContent,
    });

    // Custom tab should be added
    await waitFor(() => {
      expect(screen.getByText('Custom Tab')).toBeInTheDocument();
    });

    // Three tabs should exist now: "Virtual Assistant", "Find help", and "Custom Tab"
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');
    expect(tabs.length).toBe(3);
  });

  it('sets the new tab as active when opened via ref', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    ref.current?.openTabWithContent({
      title: 'New Active Tab',
      tabType: TabType.api,
      content: <div>API content</div>,
    });

    await waitFor(() => {
      const newTab = screen.getByText('New Active Tab');
      expect(newTab).toBeInTheDocument();

      // The tab should be selected (active)
      const tabElement = newTab.closest('[role="tab"]');
      expect(tabElement).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('updates existing tab when openTabWithContent is called with same id', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    const tabId = 'unique-tab-id';

    // Open tab first time
    ref.current?.openTabWithContent({
      id: tabId,
      title: 'Original Title',
      tabType: TabType.learn,
      content: <div>Original content</div>,
    });

    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });

    // Update same tab
    ref.current?.openTabWithContent({
      id: tabId,
      title: 'Updated Title',
      tabType: TabType.api,
      content: <div>Updated content</div>,
    });

    // Title should be updated
    await waitFor(() => {
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
    });

    // Should still only have 3 tabs (VA + Find help + updated tab)
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');
    expect(tabs.length).toBe(3);
  });

  it('creates closeable tabs via openTabWithContent', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    ref.current?.openTabWithContent({
      title: 'Closeable Tab',
      tabType: TabType.support,
      content: <div>Support content</div>,
    });

    await waitFor(() => {
      expect(screen.getByText('Closeable Tab')).toBeInTheDocument();
    });

    // Should have close button enabled (not disabled)
    const closeButtons = screen.getAllByRole('button', { name: /close tab/i });
    const closeableButton = closeButtons.find(
      (btn) => !(btn as HTMLButtonElement).disabled
    );
    expect(closeableButton).toBeDefined();
  });

  it('can open multiple tabs with different content via ref', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    ref.current?.openTabWithContent({
      title: 'Tab 1',
      tabType: TabType.learn,
      content: <div>Content 1</div>,
    });

    ref.current?.openTabWithContent({
      title: 'Tab 2',
      tabType: TabType.api,
      content: <div>Content 2</div>,
    });

    await waitFor(() => {
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    // Should have 4 tabs: "Virtual Assistant", "Find help", "Tab 1", "Tab 2"
    const mainTabs = document.querySelector(
      '[data-ouia-component-id="help-panel-tabs"]'
    ) as HTMLElement;
    const tabs = within(mainTabs).getAllByRole('tab');
    expect(tabs.length).toBe(4);
  });

  it('switches to existing tab when opened again with same id', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();
    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    const tabId = 'persistent-tab';

    // Open first tab
    ref.current?.openTabWithContent({
      id: tabId,
      title: 'Persistent Tab',
      tabType: TabType.learn,
    });

    // Open another tab
    ref.current?.openTabWithContent({
      title: 'Another Tab',
      tabType: TabType.api,
    });

    await waitFor(() => {
      // "Another Tab" should be active now
      const anotherTab = screen
        .getByText('Another Tab')
        .closest('[role="tab"]');
      expect(anotherTab).toHaveAttribute('aria-selected', 'true');
    });

    // Re-open the persistent tab - should switch to it
    ref.current?.openTabWithContent({
      id: tabId,
      title: 'Persistent Tab Updated',
      tabType: TabType.support,
    });

    await waitFor(() => {
      // Persistent tab should now be active
      const persistentTab = screen
        .getByText('Persistent Tab Updated')
        .closest('[role="tab"]');
      expect(persistentTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
