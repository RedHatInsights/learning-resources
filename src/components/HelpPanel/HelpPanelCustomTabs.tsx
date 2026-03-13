import { Tab, TabTitleText, Tabs, debounce } from '@patternfly/react-core';
import React, {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useState,
} from 'react';
import classNames from 'classnames';

import './HelpPanelCustomTabs.scss';
import HelpPanelTabContainer from './HelpPanelTabs/HelpPanelTabContainer';
import QuickStartsPanel from './HelpPanelTabs/QuickStartsPanel';
import { TabType } from './HelpPanelTabs/helpPanelTabsMapper';
import { getOpenQuickstartInHelpPanelStore } from '../../store/openQuickstartInHelpPanelStore';
import { useGetState } from '@scalprum/react-core';
import { useFlag, useFlags } from '@unleash/proxy-client-react';
import { useIntl } from 'react-intl';
import { OutlinedCommentsIcon, SearchIcon } from '@patternfly/react-icons';
import {
  QuickStartCloseModal,
  QuickStartStatus,
} from '@patternfly/quickstarts';
import type { AllQuickStartStates } from '@patternfly/quickstarts';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import fetchQuickstarts from '../../utils/fetchQuickstarts';
import type { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import messages from '../../Messages';
import { HelpPanelTabContent } from './HelpPanelLink';
import type { OpenQuickstartInHelpPanelState } from '../../store/openQuickstartInHelpPanelStore';

type TabDefinition = {
  id: string;
  title: ReactNode;
  tabTitle?: string;
  closeable?: boolean;
  tabType: TabType;
  isNewTab?: boolean; // Track if this was originally a "New tab"
  customContent?: ReactNode; // For custom content in tabs (from HelpPanelLink)
  /** Set when tabType is TabType.quickstart */
  quickstartId?: string;
};

export type HelpPanelCustomTabsRef = {
  openTabWithContent: (content: HelpPanelTabContent) => void;
};

type SubTab = Omit<TabDefinition, 'id'> & {
  tabType: TabType;
  featureFlag?: string;
  icon?: ReactNode;
};

const createBaseTabs = (showVA: boolean): TabDefinition[] => {
  const tabs = [];

  if (showVA) {
    tabs.push({
      id: 'virtual-assistant',
      title: <OutlinedCommentsIcon />,
      closeable: false,
      tabType: TabType.va,
    });
  }

  tabs.push({
    id: 'find-help',
    title: 'Find help',
    closeable: false,
    tabType: TabType.learn,
  });

  return tabs;
};

const subTabs: SubTab[] = [
  {
    title: 'Search',
    tabType: TabType.search,
    icon: <SearchIcon />,
    featureFlag: 'platform.chrome.help-panel_search',
  },
  {
    title: 'Learn',
    tabType: TabType.learn,
  },
  {
    title: 'Knowledge base',
    tabType: TabType.kb,
    featureFlag: 'platform.chrome.help-panel_knowledge-base',
  },
  {
    title: 'APIs',
    tabTitle: 'API documentation',
    tabType: TabType.api,
  },
  {
    title: 'Support',
    tabTitle: 'Support',
    tabType: TabType.support,
  },
  {
    title: 'Feedback',
    tabTitle: 'Share feedback',
    tabType: TabType.feedback,
  },
];

// Helper function to get sub-tab title by TabType (intl optional for translatable titles)
const getSubTabTitle = (
  tabType: TabType,
  intl?: ReturnType<typeof useIntl>
): string => {
  if (tabType === TabType.quickstart && intl) {
    return intl.formatMessage(messages.quickstartTabTitle);
  }
  if (tabType === TabType.quickstart) {
    return 'Quick start';
  }
  const subTab = subTabs.find((tab) => tab.tabType === tabType);
  if (tabType === TabType.search) {
    return 'Search';
  }
  if (tabType === TabType.api && intl) {
    return intl.formatMessage(messages.apiDocumentation);
  }
  return subTab?.tabTitle || (subTab?.title as string) || 'Find help';
};

const NEW_TAB_PLACEHOLDER = 'New tab';

// just mocking the tabs store until we have API
const createTabsStore = (baseTabs: TabDefinition[]) => {
  let tabs: TabDefinition[] = [...baseTabs];
  const subscribers = new Map<string, () => void>();
  const addTab = (tab: TabDefinition) => {
    tabs.push(tab);
  };

  const updateTab = (tab: TabDefinition) => {
    tabs = tabs.map((t) => (t.id === tab.id ? tab : t));
  };

  const removeTab = (tabId: string) => {
    tabs = tabs.filter((t) => t.id !== tabId);
  };

  const subscribe = (callback: () => void) => {
    const id = crypto.randomUUID();
    subscribers.set(id, callback);
    return () => {
      subscribers.delete(id);
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapNotify = (cb: (...args: any[]) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => {
      cb(...args);
      for (const callback of subscribers.values()) {
        callback();
      }
    };
  };

  return {
    addTab: wrapNotify(addTab),
    updateTab: wrapNotify(updateTab),
    removeTab: wrapNotify(removeTab),
    subscribe,
    getTabs: () => tabs,
  };
};

const useTabs = (apiStoreMock: ReturnType<typeof createTabsStore>) => {
  const [tabs, dispatch] = useReducer(() => {
    return [...apiStoreMock.getTabs()];
  }, apiStoreMock.getTabs());
  const { getTabs, subscribe, ...rest } = apiStoreMock;

  useEffect(() => {
    const unsubscribe = subscribe(dispatch);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    tabs,
    ...rest,
  };
};

function isTabType(value: string): value is TabType {
  return Object.values(TabType).includes(value as TabType);
}

const SubTabs = ({
  children,
  activeSubTabKey,
  setActiveSubTabKey,
}: PropsWithChildren<{
  activeSubTabKey: TabType;
  setActiveSubTabKey: (key: TabType) => void;
}>) => {
  const flags = useFlags();
  const filteredSubTabs = useMemo(() => {
    return subTabs.filter((tab) => {
      if (typeof tab.featureFlag === 'string') {
        return !!flags.find(({ name }) => name === tab.featureFlag)?.enabled;
      }
      return true;
    });
  }, [flags, subTabs]);

  return (
    <>
      <Tabs
        mountOnEnter
        isBox={false}
        isSubtab
        activeKey={activeSubTabKey}
        onSelect={(_e, eventKey) => {
          if (typeof eventKey === 'string' && isTabType(eventKey)) {
            setActiveSubTabKey(eventKey);
          }
        }}
        data-ouia-component-id="help-panel-subtabs"
      >
        {filteredSubTabs.map((tab) => (
          <Tab
            eventKey={tab.tabType}
            key={tab.tabType}
            title={
              <TabTitleText>{tab.icon ? tab.icon : tab.title}</TabTitleText>
            }
            aria-label={tab.title as string}
            data-ouia-component-id={`help-panel-subtab-${tab.tabType}`}
          />
        ))}
      </Tabs>
      {children}
    </>
  );
};

const HelpPanelCustomTabs = React.forwardRef<HelpPanelCustomTabsRef>(
  (_, ref) => {
    const intl = useIntl();
    const chrome = useChrome();
    const vaFlag = useFlag('platform.chrome.help-panel_chatbot');

    const baseTabs = useMemo(() => createBaseTabs(vaFlag), [vaFlag]);
    const apiStoreMock = useMemo(() => createTabsStore(baseTabs), [baseTabs]);

    // Find the Learn tab index (it might be 0 or 1 depending on VA flag)
    const learnTabIndex = baseTabs.findIndex(
      (tab) => tab.tabType === TabType.learn
    );
    const [activeTab, setActiveTab] = useState<TabDefinition>(
      baseTabs[learnTabIndex]
    ); // Default to 'Find help' tab (Learn)

    const [newActionTitle, setNewActionTitle] = useState<string | undefined>(
      undefined
    );
    const { tabs, addTab, removeTab, updateTab } = useTabs(apiStoreMock);

    const [helpPanelQuickStarts, setHelpPanelQuickStarts] = useState<
      ExtendedQuickstart[]
    >([]);
    const [helpPanelQuickStartsLoading, setHelpPanelQuickStartsLoading] =
      useState(true);
    const [allQuickStartStates, setAllQuickStartStates] =
      useState<AllQuickStartStates>({});
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(
      null
    );

    const closeQuickstartTab = useCallback(
      (tabId: string) => {
        const closingIndex = tabs.findIndex((t) => t.id === tabId);
        if (closingIndex === -1) return;
        const isClosingActiveTab = activeTab.id === tabId;
        removeTab(tabId);
        const remaining = tabs.filter((t) => t.id !== tabId);
        if (!isClosingActiveTab || remaining.length === 0) return;
        const nextIndex = Math.max(
          0,
          Math.min(closingIndex, remaining.length - 1)
        );
        setActiveTab(remaining[nextIndex]);
      },
      [tabs, removeTab, activeTab.id]
    );

    const handleQuickstartDrawerClose = useCallback(
      (tabId: string) => (activeQuickStartStatus: string | number) => {
        if (activeQuickStartStatus === QuickStartStatus.IN_PROGRESS) {
          setPendingCloseTabId(tabId);
          setCloseModalOpen(true);
        } else {
          closeQuickstartTab(tabId);
        }
      },
      [closeQuickstartTab]
    );

    const handleQuickstartCloseNotInProgress = useCallback(
      (tabId: string) => () => {
        const closingIndex = tabs.findIndex((t) => t.id === tabId);
        removeTab(tabId);
        const remaining = tabs.filter((t) => t.id !== tabId);
        if (remaining.length > 0) {
          const idx = Math.max(0, closingIndex - 1);
          setActiveTab(remaining[Math.min(idx, remaining.length - 1)]);
        }
      },
      [tabs, removeTab]
    );

    useEffect(() => {
      let cancelled = false;
      setHelpPanelQuickStartsLoading(true);
      if (!chrome?.auth?.getUser) {
        setHelpPanelQuickStartsLoading(false);
        return () => {
          cancelled = true;
        };
      }
      chrome.auth
        .getUser()
        .then((user) => {
          if (!user || cancelled) {
            if (!cancelled) setHelpPanelQuickStartsLoading(false);
            return;
          }
          return fetchQuickstarts(chrome.auth.getUser, {}).then((data) => {
            if (!cancelled) {
              setHelpPanelQuickStarts(data);
              setHelpPanelQuickStartsLoading(false);
            }
          });
        })
        .catch((err) => {
          if (!cancelled) {
            setHelpPanelQuickStartsLoading(false);
            console.error('Help Panel: failed to load quickstarts', err);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [chrome?.auth]);

    const setNewActionTitleDebounced: (title: string) => void = useCallback(
      debounce((title: string) => {
        // For search tabs, update title immediately when user types
        if (activeTab.tabType === TabType.search) {
          if (title.trim()) {
            const newTitle = title.trim();
            setNewActionTitle(newTitle);
            updateTab({
              ...activeTab,
              title: newTitle,
            });
          } else {
            // When search is cleared, revert based on the actual tab type
            const defaultTitle =
              activeTab.tabType === TabType.search
                ? 'Search'
                : getSubTabTitle(activeTab.tabType, intl);
            setNewActionTitle(undefined);
            updateTab({
              ...activeTab,
              title: defaultTitle,
            });
          }
          return;
        }

        // For other tabs, use the existing logic
        if (
          (!newActionTitle || activeTab.title === NEW_TAB_PLACEHOLDER) &&
          activeTab.closeable
        ) {
          setNewActionTitle(title);
          updateTab({
            ...activeTab,
            title,
          });
        }
      }, 100), // Reduced debounce time for search
      [activeTab, newActionTitle, intl]
    );

    const handleAddTab = () => {
      // The title will be a placeholder until action is taken by the user
      setNewActionTitle(undefined);
      const newTabId = crypto.randomUUID();
      const tab = {
        id: newTabId,
        title: NEW_TAB_PLACEHOLDER,
        closeable: true,
        tabType: TabType.learn,
        isNewTab: true,
      };
      addTab(tab);
      setTimeout(() => {
        // just make sure the tab is added
        // once async is done, we should use optimistic UI pattern
        setActiveTab(tab);
      });
    };

    const openTabWithContent = useCallback(
      (content: HelpPanelTabContent) => {
        const newTabId = content.id || crypto.randomUUID();
        const existingTab = tabs.find((tab) => tab.id === newTabId);

        if (existingTab) {
          const updatedTab: TabDefinition = {
            ...existingTab,
            title: content.title,
            tabType: content.tabType,
            customContent: content.content,
          };
          updateTab(updatedTab);
          setTimeout(() => {
            setActiveTab(updatedTab);
          });
        } else {
          const tab: TabDefinition = {
            id: newTabId,
            title: content.title,
            closeable: true,
            tabType: content.tabType,
            customContent: content.content,
            isNewTab: false,
          };
          addTab(tab);
          setTimeout(() => {
            setActiveTab(tab);
          });
        }
      },
      [addTab, updateTab, tabs]
    );

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        openTabWithContent,
      }),
      [openTabWithContent]
    );

    const handleClose = (_e: unknown, tabId: number | string) => {
      if (typeof tabId !== 'string') return;
      const tab = tabs.find((t) => t.id === tabId);
      if (tab?.tabType === TabType.quickstart && tab.quickstartId) {
        const status = allQuickStartStates[tab.quickstartId]?.status;
        if (status === QuickStartStatus.IN_PROGRESS) {
          setPendingCloseTabId(tabId);
          setCloseModalOpen(true);
          return;
        }
        closeQuickstartTab(tabId);
        return;
      }
      const closingTabIndex = tabs.findIndex((t) => t.id === tabId);
      const isClosingActiveTab = activeTab.id === tabId;
      removeTab(tabId);
      if (isClosingActiveTab) {
        const remainingTabs = tabs.filter((t) => t.id !== tabId);
        if (remainingTabs.length > 0) {
          const newActiveIndex =
            closingTabIndex >= remainingTabs.length
              ? remainingTabs.length - 1
              : closingTabIndex;
          setActiveTab(remainingTabs[newActiveIndex]);
        }
      }
    };

    const openQuickstartStore = getOpenQuickstartInHelpPanelStore();
    const openQuickstartState =
      useGetState<OpenQuickstartInHelpPanelState>(openQuickstartStore);

    useEffect(() => {
      const { pendingOpen } = openQuickstartState;
      if (!pendingOpen) return;
      const { quickstartId, displayName } = pendingOpen;
      const existing = tabs.find(
        (t) =>
          t.tabType === TabType.quickstart && t.quickstartId === quickstartId
      );
      if (existing) {
        setActiveTab(existing);
      } else {
        const newTab: TabDefinition = {
          id: crypto.randomUUID(),
          title: displayName,
          closeable: true,
          tabType: TabType.quickstart,
          quickstartId,
        };
        addTab(newTab);
        setActiveTab(newTab);
      }
      openQuickstartStore.updateState('CONSUMED_OPEN');
    }, [openQuickstartState.pendingOpen, openQuickstartStore, addTab, tabs]);

    useEffect(() => {
      // When baseTabs change (e.g., feature flag toggle), update activeTab if necessary
      // Only reset if the current active tab is a base tab (not closeable) and no longer available
      if (
        !activeTab.closeable &&
        !baseTabs.find((tab) => tab.id === activeTab.id)
      ) {
        // Current active tab is no longer available, default to Learn tab
        const learnTab = baseTabs.find((tab) => tab.tabType === TabType.learn);
        if (learnTab) {
          setActiveTab(learnTab);
        }
      }
    }, [baseTabs, activeTab.id, activeTab.closeable]);

    useEffect(() => {
      // Ensure the Add tab button has a stable OUIA id
      const addButton = document.querySelector(
        '[data-ouia-component-id="help-panel-tabs"] button[aria-label="Add tab"]'
      ) as HTMLButtonElement | null;
      if (addButton) {
        addButton.setAttribute(
          'data-ouia-component-id',
          'help-panel-add-tab-button'
        );
      }
    }, [tabs.length]);

    return (
      <>
        <div className="lr-c-help-panel-tabs-wrapper">
          <Tabs
            className="lr-c-help-panel-custom-tabs"
            isOverflowHorizontal={{ showTabCount: true }}
            isBox
            onAdd={handleAddTab}
            onClose={handleClose}
            activeKey={activeTab.id}
            onSelect={(_e, eventKey) => {
              if (typeof eventKey === 'string') {
                const nextTab = tabs.find((tab) => tab.id === eventKey);
                if (nextTab) {
                  setActiveTab(nextTab);
                }
              }
            }}
            data-ouia-component-id="help-panel-tabs"
            addButtonAriaLabel="Add tab"
          >
            {tabs.map((tab) => (
              <Tab
                // Need to fix the icon as we can't remove it on tab by tab basis
                isCloseDisabled={!tab.closeable}
                className={classNames('lr-c-help-panel-custom-tab', {
                  'persistent-tab': !tab.closeable,
                })}
                eventKey={tab.id}
                key={tab.id}
                title={<TabTitleText>{tab.title}</TabTitleText>}
                data-ouia-component-id={`help-panel-tab-${tab.id}`}
                aria-label={
                  tab.tabType === TabType.va ? 'Virtual Assistant' : undefined
                }
              >
                <div
                  className={
                    tab.tabType === TabType.quickstart && tab.quickstartId
                      ? 'lr-c-help-panel-tab-content lr-c-help-panel-tab-content--quickstart'
                      : 'lr-c-help-panel-tab-content'
                  }
                  style={{
                    display: activeTab.id === tab.id ? 'block' : 'none',
                  }}
                >
                  {tab.tabType === TabType.quickstart && tab.quickstartId ? (
                    <QuickStartsPanel
                      activeQuickStartID={tab.quickstartId}
                      quickStarts={helpPanelQuickStarts}
                      loading={helpPanelQuickStartsLoading}
                      allQuickStartStates={allQuickStartStates}
                      setAllQuickStartStates={setAllQuickStartStates}
                      onClose={handleQuickstartDrawerClose(tab.id)}
                      onCloseNotInProgress={handleQuickstartCloseNotInProgress(
                        tab.id
                      )}
                    />
                  ) : (
                    <>
                      {tab.tabType === TabType.va ? (
                        <HelpPanelTabContainer
                          activeTabType={tab.tabType}
                          setNewActionTitle={setNewActionTitleDebounced}
                        />
                      ) : (
                        <SubTabs
                          activeSubTabKey={tab.tabType ?? TabType.learn}
                          setActiveSubTabKey={(tabType) => {
                            let newTitle = tab.title;
                            if (!tab.closeable) {
                              newTitle = getSubTabTitle(tabType, intl);
                            } else if (tab.isNewTab) {
                              newTitle = getSubTabTitle(tabType, intl);
                            }
                            const nextTab = {
                              ...tab,
                              tabType: tabType,
                              title: newTitle,
                            };
                            updateTab(nextTab);
                            setActiveTab(nextTab);
                          }}
                        >
                          <HelpPanelTabContainer
                            activeTabType={tab.tabType}
                            setNewActionTitle={setNewActionTitleDebounced}
                            customContent={tab.customContent}
                          />
                        </SubTabs>
                      )}
                    </>
                  )}
                </div>
              </Tab>
            ))}
          </Tabs>
        </div>
        <QuickStartCloseModal
          isOpen={closeModalOpen}
          onConfirm={() => {
            if (pendingCloseTabId) {
              closeQuickstartTab(pendingCloseTabId);
            }
            setPendingCloseTabId(null);
            setCloseModalOpen(false);
          }}
          onCancel={() => {
            setPendingCloseTabId(null);
            setCloseModalOpen(false);
          }}
        />
      </>
    );
  }
);

HelpPanelCustomTabs.displayName = 'HelpPanelCustomTabs';

export default HelpPanelCustomTabs;
