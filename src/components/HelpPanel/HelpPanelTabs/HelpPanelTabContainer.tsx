import React, { ReactNode, useMemo } from 'react';
import classnames from 'classnames';
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

  const isVATab = activeTabType === TabType.va;
  const containerClassName = classnames({
    'pf-v6-u-p-md': !isVATab,
    'lr-c-help-panel-tab-content--va': isVATab,
  });

  // If custom content is provided, render it directly
  if (customContent) {
    return (
      <div
        className={containerClassName}
        data-ouia-component-id="help-panel-content-container"
      >
        {customContent}
      </div>
    );
  }

  // Otherwise, render the standard tab component
  return (
    <div
      className={containerClassName}
      data-ouia-component-id="help-panel-content-container"
    >
      <ActiveComponent setNewActionTitle={setNewActionTitle} />
    </div>
  );
};

export default HelpPanelTabContainer;
