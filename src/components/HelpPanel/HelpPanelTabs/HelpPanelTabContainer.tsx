import React, { useMemo } from 'react';
import helpPanelTabsMapper, { TabType } from './helpPanelTabsMapper';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';

const HelpPanelTabContainer = ({
  setNewActionTitle,
  activeTabType,
  quickstartData,
}: {
  setNewActionTitle: (title: string) => void;
  activeTabType: TabType;
  quickstartData?: ExtendedQuickstart;
}) => {
  const ActiveComponent = useMemo(() => {
    return helpPanelTabsMapper[activeTabType];
  }, [activeTabType]);
  return (
    <ActiveComponent
      setNewActionTitle={setNewActionTitle}
      quickstartData={quickstartData}
    />
  );
};

export default HelpPanelTabContainer;
