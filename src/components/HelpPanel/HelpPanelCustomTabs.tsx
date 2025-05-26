import { Tab, TabTitleText, Tabs, debounce } from '@patternfly/react-core';
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
import { useFlags } from '@unleash/proxy-client-react';

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
    id: 'get-started',
    title: 'Get started',
    closeable: false,
    tabType: TabType.search,
  },
];

const subTabs: SubTab[] = [
  {
    title: 'Search',
    tabType: TabType.search,
  },
  {
    title: 'Learn',
    tabType: TabType.learn,
  },
  {
    title: 'Knowledge base',
    tabType: TabType.kb,
    featureFlag: 'platform.help-panel.kb',
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
      >
        {filteredSubTabs.map((tab) => (
          <Tab
            eventKey={tab.tabType}
            key={tab.tabType}
            title={<TabTitleText>{tab.title}</TabTitleText>}
          />
        ))}
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
        >
          <SubTabs
            activeSubTabKey={tab.tabType ?? TabType.search}
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
