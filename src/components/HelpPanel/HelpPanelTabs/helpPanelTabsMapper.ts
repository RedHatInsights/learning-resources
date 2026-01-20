import APIPanel from './APIPanel';
import KBPanel from './KBPanel';
import LearnPanel from './LearnPanel';
import QuickstartPanel from './QuickstartPanel';
import SearchPanel from './SearchPanel';
import SupportPanel from './SupportPanel';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';

export enum TabType {
  'search' = 'search',
  'learn' = 'learn',
  'kb' = 'kb',
  'api' = 'api',
  'support' = 'support',
  'quickstart' = 'quickstart',
}

export type SubTabProps = {
  setNewActionTitle?: (title: string) => void;
  quickstartData?: ExtendedQuickstart;
};

const helpPanelTabsMapper: {
  [type in TabType]: React.ComponentType<SubTabProps>;
} = {
  [TabType.search]: SearchPanel,
  [TabType.learn]: LearnPanel,
  [TabType.kb]: KBPanel,
  [TabType.api]: APIPanel,
  [TabType.support]: SupportPanel,
  [TabType.quickstart]: QuickstartPanel,
};

export default helpPanelTabsMapper;
