import React from 'react';
import {
  Button,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import HelpPanelCustomTabs from './HelpPanelCustomTabs';

const HelpPanelContent = ({ toggleDrawer }: { toggleDrawer: () => void }) => {
  return (
    <>
      <DrawerHead>
        <Title headingLevel="h2">
          Help
          <Button
            variant="link"
            component="a"
            href="https://status.redhat.com/"
            target="_blank"
            isInline
            className="pf-v6-u-font-size-sm pf-v6-u-font-weight-normal pf-v6-u-ml-md"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
          >
            Red Hat status page
          </Button>
        </Title>
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
