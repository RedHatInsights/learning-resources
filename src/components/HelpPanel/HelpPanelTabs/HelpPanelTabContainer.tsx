import React, { useMemo } from 'react';
import helpPanelTabsMapper, { TabType } from './helpPanelTabsMapper';

const HelpPanelTabContainer = ({
  setNewActionTitle,
  activeTabType,
}: {
  setNewActionTitle: (title: string) => void;
  activeTabType: TabType;
}) => {
  const ActiveComponent = useMemo(() => {
    return helpPanelTabsMapper[activeTabType];
  }, [activeTabType]);
  return (
    <div
      className="pf-v6-u-p-md"
      data-ouia-component-id="help-panel-content-container"
    >
      <ActiveComponent setNewActionTitle={setNewActionTitle} />
    </div>
  );
};

export default HelpPanelTabContainer;
