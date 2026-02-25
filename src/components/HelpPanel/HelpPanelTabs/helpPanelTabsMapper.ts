import APIPanel from './APIPanel';
import KBPanel from './KBPanel';
import LearnPanel from './LearnPanel';
import SearchPanel from './SearchPanel';
import SupportPanel from './SupportPanel';
import VAPanel from './VAPanel';

export enum TabType {
  'search' = 'search',
  'learn' = 'learn',
  'kb' = 'kb',
  'api' = 'api',
  'support' = 'support',
  'va' = 'va',
  'quickstart' = 'quickstart',
}

export type SubTabProps = {
  setNewActionTitle: (title: string) => void;
};

/** Placeholder for quickstart tabs; content is rendered by HelpPanelCustomTabs, not the mapper. */
const QuickstartPanelPlaceholder: React.FC<SubTabProps> = () => null;

const helpPanelTabsMapper: {
  [type in TabType]: React.ComponentType<SubTabProps>;
} = {
  [TabType.search]: SearchPanel,
  [TabType.learn]: LearnPanel,
  [TabType.kb]: KBPanel,
  [TabType.api]: APIPanel,
  [TabType.support]: SupportPanel,
  [TabType.va]: VAPanel,
  [TabType.quickstart]: QuickstartPanelPlaceholder,
};

export default helpPanelTabsMapper;
