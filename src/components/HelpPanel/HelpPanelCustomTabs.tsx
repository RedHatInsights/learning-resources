import {
  Button,
  Tab,
  TabTitleText,
  Tabs,
  debounce,
} from '@patternfly/react-core';
import React, {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import classNames from 'classnames';
import { useIntl } from 'react-intl';

import './HelpPanelCustomTabs.scss';
import HelpPanelTabContainer from './HelpPanelTabs/HelpPanelTabContainer';
import { TabType } from './HelpPanelTabs/helpPanelTabsMapper';
import { useFlag, useFlags } from '@unleash/proxy-client-react';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import { HelpPanelTabsContext } from './HelpPanelTabsContext';
import messages from '../../Messages';

type TabDefinition = {
  id: string;
  title: ReactNode;
  tabTitle?: string;
  closeable?: boolean;
  tabType: TabType;
  isNewTab?: boolean; // Track if this was originally a "New tab"
  quickstartData?: ExtendedQuickstart; // Optional quickstart data for quickstart tabs
};

type SubTab = Omit<TabDefinition, 'id'> & {
  tabType: TabType;
  featureFlag?: string;
};

// Helper to get translated tabs - takes formatMessage function
const getBaseTabs = (
  formatMessage: (descriptor: { id: string; defaultMessage: string }) => string
): TabDefinition[] => [
  {
    id: 'find-help',
    title: formatMessage(messages.tabFindHelp),
    closeable: false,
    tabType: TabType.learn,
  },
];

const getSubTabs = (
  formatMessage: (descriptor: { id: string; defaultMessage: string }) => string
): SubTab[] => [
  {
    title: formatMessage(messages.tabSearch),
    tabType: TabType.search,
    featureFlag: 'platform.chrome.help-panel_search',
  },
  {
    title: formatMessage(messages.tabLearn),
    tabType: TabType.learn,
  },
  {
    title: formatMessage(messages.tabKnowledgeBase),
    tabType: TabType.kb,
    featureFlag: 'platform.chrome.help-panel_knowledge-base',
  },
  {
    title: formatMessage(messages.tabApis),
    tabType: TabType.api,
  },
  {
    title: formatMessage(messages.tabMySupportCases),
    tabTitle: formatMessage(messages.tabSupport),
    tabType: TabType.support,
  },
];

// Helper function to get sub-tab title by TabType
const getSubTabTitle = (
  tabType: TabType,
  subTabs: SubTab[],
  defaultTitle: string
): string => {
  const subTab = subTabs.find((tab) => tab.tabType === tabType);
  return subTab?.tabTitle || (subTab?.title as string) || defaultTitle;
};

// just mocking the tabs store until we have API
const createTabsStore = (initialTabs: TabDefinition[]) => {
  let tabs: TabDefinition[] = [...initialTabs];
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
  const intl = useIntl();
  const flags = useFlags();
  const subTabs = useMemo(
    () => getSubTabs(intl.formatMessage),
    [intl.formatMessage]
  );
  const filteredSubTabs = useMemo(() => {
    return subTabs.filter((tab) => {
      if (typeof tab.featureFlag === 'string') {
        return !!flags.find(({ name }) => name === tab.featureFlag)?.enabled;
      }
      return true;
    });
  }, [flags, subTabs]);

  const searchFlag = useFlag('platform.chrome.help-panel_search');
  const kbFlag = useFlag('platform.chrome.help-panel_knowledge-base');

  const showStatusPageButton = !searchFlag && !kbFlag;
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
        <>
          {filteredSubTabs.map((tab) => (
            <Tab
              eventKey={tab.tabType}
              key={tab.tabType}
              title={<TabTitleText>{tab.title}</TabTitleText>}
              data-ouia-component-id={`help-panel-subtab-${tab.tabType}`}
            />
          ))}
          {showStatusPageButton && (
            <Button
              variant="link"
              component="a"
              href="https://status.redhat.com/"
              target="_blank"
              isInline
              className="pf-v6-u-font-size-sm pf-v6-u-font-weight-normal pf-v6-u-ml-md lr-c-status-page-button"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              data-ouia-component-id="help-panel-status-page-subtabs-button"
            >
              {intl.formatMessage(messages.redHatStatusPage)}
            </Button>
          )}
        </>
      </Tabs>
      {children}
    </>
  );
};

const HelpPanelCustomTabs = () => {
  const intl = useIntl();
  const baseTabs = useMemo(
    () => getBaseTabs(intl.formatMessage),
    [intl.formatMessage]
  );
  const subTabs = useMemo(
    () => getSubTabs(intl.formatMessage),
    [intl.formatMessage]
  );
  const newTabPlaceholder = intl.formatMessage(messages.tabNewTab);
  const addTabAriaLabel = intl.formatMessage(messages.tabAddTab);
  const findHelpTitle = intl.formatMessage(messages.tabFindHelp);

  const apiStoreMock = useMemo(() => createTabsStore(baseTabs), [baseTabs]);
  const [activeTab, setActiveTab] = useState<TabDefinition>(() => baseTabs[0]);

  const [newActionTitle, setNewActionTitle] = useState<string | undefined>(
    undefined
  );
  const { tabs, addTab, removeTab, updateTab } = useTabs(apiStoreMock);

  // Function to open a quickstart in a new tab
  const openQuickstartTab = useCallback(
    (quickstart: ExtendedQuickstart) => {
      const newTabId = crypto.randomUUID();
      const tab: TabDefinition = {
        id: newTabId,
        title: quickstart.spec.displayName,
        closeable: true,
        tabType: TabType.quickstart,
        quickstartData: quickstart,
      };
      addTab(tab);
      setTimeout(() => {
        setActiveTab(tab);
      });
    },
    [addTab]
  );

  const contextValue = useMemo(
    () => ({ openQuickstartTab }),
    [openQuickstartTab]
  );

  const setNewActionTitleDebounced: (title: string) => void = useCallback(
    debounce((title: string) => {
      console.log({ activeTab });
      if (
        (!newActionTitle || activeTab.title === newTabPlaceholder) &&
        activeTab.closeable
      ) {
        setNewActionTitle(title);
        updateTab({
          ...activeTab,
          title,
        });
      }
    }, 2000),
    [activeTab, newTabPlaceholder]
  );

  const handleAddTab = () => {
    // The title will be a placeholder until action is taken by the user
    setNewActionTitle(undefined);
    const newTabId = crypto.randomUUID();
    const tab = {
      id: newTabId,
      title: newTabPlaceholder,
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

  const handleClose = (_e: unknown, tabId: number | string) => {
    if (typeof tabId === 'string') {
      const closingTabIndex = tabs.findIndex((tab) => tab.id === tabId);
      const isClosingActiveTab = activeTab.id === tabId;

      removeTab(tabId);
      if (isClosingActiveTab) {
        const remainingTabs = tabs.filter((tab) => tab.id !== tabId);

        if (remainingTabs.length > 0) {
          const newActiveIndex =
            closingTabIndex >= remainingTabs.length
              ? remainingTabs.length - 1
              : closingTabIndex;

          setActiveTab(remainingTabs[newActiveIndex]);
        }
      }
    }
  };

  useEffect(() => {
    // Ensure the Add tab button has a stable OUIA id
    const addButton = document.querySelector(
      `[data-ouia-component-id="help-panel-tabs"] button[aria-label="${addTabAriaLabel}"]`
    ) as HTMLButtonElement | null;
    if (addButton) {
      addButton.setAttribute(
        'data-ouia-component-id',
        'help-panel-add-tab-button'
      );
    }
  }, [tabs.length, addTabAriaLabel]);

  return (
    <HelpPanelTabsContext.Provider value={contextValue}>
      <Tabs
        className="lr-c-help-panel-custom-tabs"
        isOverflowHorizontal={{ showTabCount: true }}
        isBox
        mountOnEnter
        unmountOnExit
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
        addButtonAriaLabel={addTabAriaLabel}
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
          >
            {tab.tabType === TabType.quickstart ? (
              // Quickstart tabs don't have sub-tabs, render directly
              <div
                className="pf-v6-u-p-md"
                data-ouia-component-id="help-panel-content-container"
              >
                <HelpPanelTabContainer
                  activeTabType={tab.tabType}
                  setNewActionTitle={setNewActionTitleDebounced}
                  quickstartData={tab.quickstartData}
                />
              </div>
            ) : (
              <SubTabs
                activeSubTabKey={tab.tabType ?? TabType.learn}
                setActiveSubTabKey={(tabType) => {
                  let newTitle = tab.title;
                  if (!tab.closeable) {
                    newTitle = getSubTabTitle(tabType, subTabs, findHelpTitle);
                  } else if (tab.isNewTab) {
                    newTitle = getSubTabTitle(tabType, subTabs, findHelpTitle);
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
                />
              </SubTabs>
            )}
          </Tab>
        ))}
      </Tabs>
    </HelpPanelTabsContext.Provider>
  );
};

export default HelpPanelCustomTabs;
