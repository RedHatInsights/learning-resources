import React, { ReactNode, useMemo } from 'react';
import helpPanelTabsMapper, { TabType } from './helpPanelTabsMapper';

const HelpPanelTabContainer = ({
  setNewActionTitle,
  activeTabType,
  customContent,
  url,
}: {
  setNewActionTitle: (title: string) => void;
  activeTabType: TabType;
  customContent?: ReactNode;
  url?: string;
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

  // If URL is provided, render it in an iframe
  if (url) {
    return (
      <div
        className="pf-v6-u-p-md"
        data-ouia-component-id="help-panel-content-container"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <iframe
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            flex: 1,
          }}
          title="External content"
        />
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
