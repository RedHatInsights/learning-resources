import React, { ReactNode, useMemo } from 'react';
import helpPanelTabsMapper, { TabType } from './helpPanelTabsMapper';

const HelpPanelTabContainer = ({
  setNewActionTitle,
  activeTabType,
  customContent,
}: {
  setNewActionTitle: (title: string) => void;
  activeTabType: TabType;
  customContent?: ReactNode;
}) => {
  const ActiveComponent = useMemo(() => {
    return helpPanelTabsMapper[activeTabType];
  }, [activeTabType]);

  // If custom content is provided, render it directly
  if (customContent) {
    return (
      <div
        className="pf-v6-u-p-md"
        data-ouia-component-id="help-panel-content-container"
      >
        {customContent}
      </div>
    );
  }

  // Otherwise, render the standard tab component
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
