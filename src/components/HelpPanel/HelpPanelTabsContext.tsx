import { createContext, useContext } from 'react';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';

// Context for exposing tab operations to child components
export type HelpPanelTabsContextType = {
  openQuickstartTab: (quickstart: ExtendedQuickstart) => void;
};

export const HelpPanelTabsContext = createContext<HelpPanelTabsContextType>({
  openQuickstartTab: () => {},
});

export const useHelpPanelTabs = () => useContext(HelpPanelTabsContext);
