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

import './HelpPanelCustomTabs.scss';
import HelpPanelTabContainer from './HelpPanelTabs/HelpPanelTabContainer';
import { TabType } from './HelpPanelTabs/helpPanelTabsMapper';
import { useFlag, useFlags } from '@unleash/proxy-client-react';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

type TabDefinition = {
  id: string;
  title: ReactNode;
  closeable?: boolean;
  tabType: TabType;
};

type SubTab = Omit<TabDefinition, 'id'> & {
  tabType: TabType;
  featureFlag?: string;
};

const baseTabs: TabDefinition[] = [
  {
    id: 'find-help',
    title: 'Find help',
    closeable: false,
    tabType: TabType.learn,
  },
];

const subTabs: SubTab[] = [
  {
    title: 'Search',
    tabType: TabType.search,
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
    tabType: TabType.api,
  },
  {
    title: 'My support cases',
    tabType: TabType.support,
  },
];

const NEW_TAB_PLACEHOLDER = 'New tab';

// just mocking the tabs store until we have API
const createTabsStore = () => {
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
              Red Hat status page
            </Button>
          )}
        </>
      </Tabs>
      {children}
    </>
  );
};

const HelpPanelCustomTabs = () => {
  const apiStoreMock = useMemo(() => createTabsStore(), []);
  const [activeTab, setActiveTab] = useState<TabDefinition>(baseTabs[0]);

  const [newActionTitle, setNewActionTitle] = useState<string | undefined>(
    undefined
  );
  const { tabs, addTab, removeTab, updateTab } = useTabs(apiStoreMock);

  const setNewActionTitleDebounced: (title: string) => void = useCallback(
    debounce((title: string) => {
      console.log({ activeTab });
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
    }, 2000),
    [activeTab]
  );

  const handleAddTab = () => {
    // The title will be a placeholder until action is taken by the user
    setNewActionTitle(undefined);
    const newTabId = crypto.randomUUID();
    console.log(activeTab);
    const tab = {
      id: newTabId,
      title: NEW_TAB_PLACEHOLDER,
      closeable: true,
      tabType: activeTab?.tabType,
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
      removeTab(tabId);
      setActiveTab(tabs[0]);
    }
  };

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
        >
          <SubTabs
            activeSubTabKey={tab.tabType ?? TabType.learn}
            setActiveSubTabKey={(tabType) => {
              const nextTab = {
                ...tab,
                tabType: tabType,
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
        </Tab>
      ))}
    </Tabs>
  );
};

export default HelpPanelCustomTabs;
