import React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Title,
} from '@patternfly/react-core';
import HelpPanelCustomTabs from './HelpPanelCustomTabs';

const HelpPanelContent = ({ toggleDrawer }: { toggleDrawer: () => void }) => {
  return (
    <>
      <DrawerHead>
        <Title headingLevel="h2">Help</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={toggleDrawer} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <HelpPanelCustomTabs />
      </DrawerPanelBody>
    </>
  );
};

export default HelpPanelContent;
