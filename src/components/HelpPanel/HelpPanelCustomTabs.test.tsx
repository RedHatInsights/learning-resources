/**
 * Unit tests for HelpPanel single-tier tab structure
 */
import React, { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  if (flagName === 'platform.va.environment.enabled') return true;
  return true;
});

const mockUseFlags = jest.fn(() => [
  { name: 'platform.chrome.help-panel_search', enabled: true },
  { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
  { name: 'platform.chrome.help-panel_chatbot', enabled: true },
]);

jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: (flagName: string) => mockUseFlag(flagName),
  useFlags: () => mockUseFlags(),
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
    feedback: 'feedback',
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

describe('HelpPanelCustomTabs single-tier structure', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      if (flagName === 'platform.va.environment.enabled') return true;
      return true;
    });
    mockUseFlags.mockReturnValue([
      { name: 'platform.chrome.help-panel_search', enabled: true },
      { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
      { name: 'platform.chrome.help-panel_chatbot', enabled: true },
    ]);
  });

  it('renders root with class lr-c-help-panel-custom-tabs used by SCSS', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const root = document.querySelector('.lr-c-help-panel-custom-tabs');
    expect(root).toBeInTheDocument();
  });

  it('does not render subtabs container (no longer exists)', () => {
    renderWithIntl(<HelpPanelCustomTabs />);
    const subtabs = document.querySelector(
      '[data-ouia-component-id="help-panel-subtabs"]'
    );
    expect(subtabs).not.toBeInTheDocument();
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

  it('shows all main tabs: Search, Learn, APIs, Support, Feedback, Virtual Assistant', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    // Check for all expected tabs
    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /learn/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /apis/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /support/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /feedback/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /virtual assistant/i })
    ).toBeInTheDocument();

    // Search should be the default active tab when search flag is enabled
    const searchTab = screen.getByRole('tab', { name: /search/i });
    expect(searchTab).toHaveAttribute('aria-selected', 'true');
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

    // Should still have other tabs
    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /learn/i })).toBeInTheDocument();
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

    expect(screen.getByRole('tab', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /learn/i })).toBeInTheDocument();
  });

  it('hides Search tab when search feature flag is disabled', () => {
    mockUseFlag.mockImplementation((flagName: string) => {
      if (flagName === 'platform.chrome.help-panel_chatbot') return true;
      if (flagName === 'platform.va.environment.enabled') return true;
      return true;
    });
    mockUseFlags.mockReturnValue([
      { name: 'platform.chrome.help-panel_search', enabled: false },
      { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
      { name: 'platform.chrome.help-panel_chatbot', enabled: true },
    ]);

    renderWithIntl(<HelpPanelCustomTabs />);

    const searchTab = screen.queryByRole('tab', { name: /search/i });
    expect(searchTab).not.toBeInTheDocument();

    // Learn should become the default active tab when Search is disabled
    const learnTab = screen.getByRole('tab', { name: /learn/i });
    expect(learnTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('HelpPanelCustomTabs tab switching', () => {
  beforeEach(() => {
    mockUseFlag.mockImplementation(() => true);
    mockUseFlags.mockReturnValue([
      { name: 'platform.chrome.help-panel_search', enabled: true },
      { name: 'platform.chrome.help-panel_knowledge-base', enabled: true },
      { name: 'platform.chrome.help-panel_chatbot', enabled: true },
    ]);
  });

  it('switches to Learn tab when clicked', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    const learnTab = screen.getByRole('tab', { name: /learn/i });
    fireEvent.click(learnTab);

    // Learn tab is selected
    expect(learnTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to APIs tab when clicked', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    const apisTab = screen.getByRole('tab', { name: /apis/i });
    fireEvent.click(apisTab);

    expect(apisTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Support tab when clicked', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    const supportTab = screen.getByRole('tab', { name: /support/i });
    fireEvent.click(supportTab);

    expect(supportTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Feedback tab when clicked', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    const feedbackTab = screen.getByRole('tab', { name: /feedback/i });
    fireEvent.click(feedbackTab);

    expect(feedbackTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('HelpPanelCustomTabs static tabs (no add/close)', () => {
  it('does not render an Add tab button', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    const addTabButton = screen.queryByRole('button', { name: /add tab/i });
    expect(addTabButton).not.toBeInTheDocument();
  });

  it('does not render close buttons on tabs', () => {
    renderWithIntl(<HelpPanelCustomTabs />);

    const closeButtons = screen.queryAllByRole('button', {
      name: /close tab/i,
    });
    expect(closeButtons.length).toBe(0);
  });
});

describe('HelpPanelCustomTabs ref API (openTabWithContent)', () => {
  it('navigates to the corresponding static tab based on tabType', async () => {
    const ref = createRef<HelpPanelCustomTabsRef>();

    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    // Capture initial tab count and active tab
    const initialTabs = screen.getAllByRole('tab');
    const initialTabCount = initialTabs.length;

    // Call openTabWithContent with Learn tab type
    ref.current?.openTabWithContent({
      id: 'custom-tab',
      title: 'Custom Content',
      tabType: TabType.learn,
      content: <div>Custom content here</div>,
    });

    // Should navigate to Learn tab (not create a new tab)
    const tabsAfterCall = screen.getAllByRole('tab');
    expect(tabsAfterCall.length).toBe(initialTabCount);

    // Learn tab should be selected (wait for state update)
    await waitFor(() => {
      const learnTab = screen.getByRole('tab', { name: /learn/i });
      expect(learnTab).toHaveAttribute('aria-selected', 'true');
    });

    // Custom content should not appear (static tabs don't support custom content)
    expect(screen.queryByText('Custom content here')).not.toBeInTheDocument();
  });

  it('logs a warning when tabType does not match any static tab', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const ref = createRef<HelpPanelCustomTabsRef>();

    renderWithIntl(<HelpPanelCustomTabs ref={ref} />);

    // Call openTabWithContent with a tabType that doesn't exist
    ref.current?.openTabWithContent({
      id: 'custom-tab',
      title: 'Custom Content',
      tabType: 'nonexistent' as TabType,
      content: <div>Custom content here</div>,
    });

    // Should log a warning
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No static tab found for tabType')
    );

    consoleWarnSpy.mockRestore();
  });
});
