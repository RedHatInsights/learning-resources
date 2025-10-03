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
import { AskRedHatIcon } from '../common/AskRedHatIcon';

const HelpPanelContent = ({ toggleDrawer }: { toggleDrawer: () => void }) => {
  return (
    <>
      <DrawerHead>
        <Title headingLevel="h2">Help</Title>
        <Button
          variant="link"
          component="a"
          href="https://status.redhat.com/"
          target="_blank"
          rel="noopener noreferrer"
          isInline
          className="pf-v6-u-font-size-sm pf-v6-u-font-weight-normal"
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
        >
          Red Hat status page
        </Button>
        <DrawerActions>
          <Button
            variant="link"
            className="pf-v6-u-align-items-flex-start"
            href="https://access.redhat.com/ask"
            target="_blank"
            rel="noopener noreferrer"
            icon={<AskRedHatIcon width={20} height={20} />}
          >
            Ask Red Hat
          </Button>
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
