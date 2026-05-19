import { Tab, TabTitleText, Tabs } from '@patternfly/react-core';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import HelpPanelTabContainer from './HelpPanelTabs/HelpPanelTabContainer';
import { TabType } from './HelpPanelTabs/helpPanelTabsMapper';
import { getOpenQuickstartInHelpPanelStore } from '../../store/openQuickstartInHelpPanelStore';
import { useGetState } from '@scalprum/react-core';
import { useFlag, useFlags } from '@unleash/proxy-client-react';
import { SearchIcon } from '@patternfly/react-icons';
import { AiChatbotIcon } from '../common/AiChatbotIcon';
import { HelpPanelTabContent } from './HelpPanelLink';
import type { OpenQuickstartInHelpPanelState } from '../../store/openQuickstartInHelpPanelStore';

type TabDefinition = {
  id: string;
  title: ReactNode;
  tabType: TabType;
  featureFlag?: string;
  icon?: ReactNode;
  customContent?: ReactNode; // For custom content in tabs (from HelpPanelLink)
  /** Set when tabType is TabType.quickstart */
  quickstartId?: string;
};

export type HelpPanelCustomTabsRef = {
  openTabWithContent: (content: HelpPanelTabContent) => void;
};

// Define all main tabs in display order: Search, Learn, APIs, Support, Feedback, Chatbot
const createMainTabs = (showVA: boolean): TabDefinition[] => {
  const tabs: TabDefinition[] = [
    {
      id: 'search',
      title: 'Search',
      tabType: TabType.search,
      icon: <SearchIcon />,
      featureFlag: 'platform.chrome.help-panel_search',
    },
    {
      id: 'learn',
      title: 'Learn',
      tabType: TabType.learn,
    },
    {
      id: 'api',
      title: 'APIs',
      tabType: TabType.api,
    },
    {
      id: 'support',
      title: 'Support',
      tabType: TabType.support,
    },
    {
      id: 'feedback',
      title: 'Feedback',
      tabType: TabType.feedback,
    },
  ];

  // Add chatbot as the last tab if enabled
  if (showVA) {
    tabs.push({
      id: 'virtual-assistant',
      title: <AiChatbotIcon />,
      tabType: TabType.va,
    });
  }

  return tabs;
};

// Helper function to filter tabs based on feature flags
const filterTabsByFeatureFlags = (
  tabs: TabDefinition[],
  flags: ReturnType<typeof useFlags>
): TabDefinition[] => {
  return tabs.filter((tab) => {
    if (typeof tab.featureFlag === 'string') {
      return !!flags.find(({ name }) => name === tab.featureFlag)?.enabled;
    }
    return true;
  });
};

const HelpPanelCustomTabs = React.forwardRef<HelpPanelCustomTabsRef>(
  (_, ref) => {
    const vaFlag = useFlag('platform.chrome.help-panel_chatbot');
    const vaEnvFlag = useFlag('platform.va.environment.enabled');
    const flags = useFlags();
    const showVA = vaFlag && vaEnvFlag;

    // Create tabs and filter by feature flags
    const allTabs = useMemo(() => createMainTabs(showVA), [showVA]);
    const tabs = useMemo(
      () => filterTabsByFeatureFlags(allTabs, flags),
      [allTabs, flags]
    );

    // Default to first available tab (Search if enabled, otherwise Learn)
    const defaultTab = useMemo(() => {
      return tabs.find((t) => t.tabType === TabType.search) ?? tabs[0];
    }, [tabs]);

    const [activeTabId, setActiveTabId] = useState<string>(
      defaultTab?.id || 'learn'
    );

    // Placeholder for setNewActionTitle - no longer used but kept for TabContainer API compatibility
    const setNewActionTitle = useCallback((title: string) => {
      // No-op: tabs are now static, titles don't change
      // This function is called by panel components but does nothing in single-tier structure
      void title; // Explicitly mark as intentionally unused
    }, []);

    // openTabWithContent translates dynamic tab requests to static tab selection
    const openTabWithContent = useCallback(
      (content: HelpPanelTabContent) => {
        // Map the requested tabType to the corresponding static tab
        const targetTab = tabs.find((tab) => tab.tabType === content.tabType);
        if (targetTab) {
          setActiveTabId(targetTab.id);
        } else {
          console.warn(
            `openTabWithContent: No static tab found for tabType "${content.tabType}". ` +
              'The tab may be hidden by feature flags or not exist.'
          );
        }
      },
      [tabs]
    );

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        openTabWithContent,
      }),
      [openTabWithContent]
    );

    // Handle quickstart opening requests
    const openQuickstartStore = getOpenQuickstartInHelpPanelStore();
    const openQuickstartState =
      useGetState<OpenQuickstartInHelpPanelState>(openQuickstartStore);

    useEffect(() => {
      const { pendingOpen } = openQuickstartState;
      if (!pendingOpen) return;

      // Switch to Learn tab (quickstart will be opened in drill-down mode by LearnPanel)
      const learnTab = tabs.find((tab) => tab.tabType === TabType.learn);
      if (learnTab) {
        setActiveTabId(learnTab.id);
      }

      // Note: we do NOT consume the event here - LearnPanel will consume it after opening the quickstart
    }, [openQuickstartState.pendingOpen, tabs]);

    // Update active tab when tabs change (due to feature flags)
    useEffect(() => {
      const currentTab = tabs.find((t) => t.id === activeTabId);
      if (!currentTab && tabs.length > 0) {
        // Current active tab is no longer available, fall back to first tab
        setActiveTabId(tabs[0].id);
      }
    }, [tabs, activeTabId]);

    return (
      <>
        <div className="lr-c-help-panel-tabs-wrapper">
          <Tabs
            className="lr-c-help-panel-custom-tabs"
            isBox
            activeKey={activeTabId}
            onSelect={(_e, eventKey) => {
              if (typeof eventKey === 'string') {
                setActiveTabId(eventKey);
              }
            }}
            data-ouia-component-id="help-panel-tabs"
            variant="default"
          >
            {tabs.map((tab) => {
              const tabTitle = tab.title;

              return (
                <Tab
                  eventKey={tab.id}
                  key={tab.id}
                  title={<TabTitleText>{tab.icon || tabTitle}</TabTitleText>}
                  data-ouia-component-id={`help-panel-tab-${tab.id}`}
                  aria-label={
                    tab.tabType === TabType.va
                      ? 'Virtual Assistant'
                      : (tabTitle as string)
                  }
                >
                  <div className="lr-c-help-panel-tab-content">
                    <HelpPanelTabContainer
                      activeTabType={tab.tabType}
                      setNewActionTitle={setNewActionTitle}
                      customContent={tab.customContent}
                    />
                  </div>
                </Tab>
              );
            })}
          </Tabs>
        </div>
      </>
    );
  }
);

HelpPanelCustomTabs.displayName = 'HelpPanelCustomTabs';

export default HelpPanelCustomTabs;
