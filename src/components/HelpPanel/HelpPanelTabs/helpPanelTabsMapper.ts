import type { ComponentType, FC } from 'react';
import APIPanel from './APIPanel';
import KBPanel from './KBPanel';
import LearnPanel from './LearnPanel';
import SearchPanel from './SearchPanel';
import SupportPanel from './SupportPanel';
import VAPanel from './VAPanel';
import FeedbackPanel from './Feedback/FeedbackPanel';

export enum TabType {
  'search' = 'search',
  'learn' = 'learn',
  'kb' = 'kb',
  'api' = 'api',
  'support' = 'support',
  'va' = 'va',
  'quickstart' = 'quickstart',
  'feedback' = 'feedback',
}

export type SubTabProps = {
  setNewActionTitle: (title: string) => void;
};

/** Placeholder for quickstart tabs; content is rendered by HelpPanelCustomTabs, not the mapper. */
const QuickstartPanelPlaceholder: FC<SubTabProps> = () => null;

const helpPanelTabsMapper: {
  [type in TabType]: ComponentType<SubTabProps>;
} = {
  [TabType.search]: SearchPanel,
  [TabType.learn]: LearnPanel,
  [TabType.kb]: KBPanel,
  [TabType.api]: APIPanel,
  [TabType.support]: SupportPanel,
  [TabType.va]: VAPanel,
  [TabType.quickstart]: QuickstartPanelPlaceholder,
  [TabType.feedback]: FeedbackPanel,
};

export default helpPanelTabsMapper;
