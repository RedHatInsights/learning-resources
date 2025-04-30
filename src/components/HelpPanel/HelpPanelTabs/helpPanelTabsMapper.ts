import APIPanel from './APIPanel';
import KBPanel from './KBPanel';
import LearnPanel from './LearnPanel';
import SearchPanel from './SearchPanel';
import SupportPanel from './SupportPanel';

export enum TabType {
  'search' = 'search',
  'learn' = 'learn',
  'kb' = 'kb',
  'api' = 'api',
  'support' = 'support',
}

export type SubTabProps = {
  setNewActionTitle: (title: string) => void;
};

const helpPanelTabsMapper: {
  [type in TabType]: React.ComponentType<SubTabProps>;
} = {
  [TabType.search]: SearchPanel,
  [TabType.learn]: LearnPanel,
  [TabType.kb]: KBPanel,
  [TabType.api]: APIPanel,
  [TabType.support]: SupportPanel,
};

export default helpPanelTabsMapper;
