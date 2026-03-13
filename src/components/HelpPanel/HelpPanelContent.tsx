import React, { useEffect, useRef } from 'react';
import {
  Button,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import HelpPanelCustomTabs, {
  HelpPanelCustomTabsRef,
} from './HelpPanelCustomTabs';
import { HelpPanelTabContent } from './HelpPanelLink';
import messages from '../../Messages';
import './HelpPanelCustomTabs.scss';

const HelpPanelContent = ({
  toggleDrawer,
  newTab,
}: {
  toggleDrawer: () => void;
  newTab?: HelpPanelTabContent;
}) => {
  const intl = useIntl();
  const tabsRef = useRef<HelpPanelCustomTabsRef>(null);

  // Open a new tab if newTab prop is provided
  useEffect(() => {
    if (newTab && tabsRef.current) {
      tabsRef.current.openTabWithContent(newTab);
    }
  }, [newTab]);

  return (
    <>
      <DrawerHead>
        <Title headingLevel="h2" data-ouia-component-id="help-panel-title">
          Help
          <Button
            variant="link"
            component="a"
            href="https://status.redhat.com/"
            target="_blank"
            rel="noopener noreferrer"
            isInline
            className="lr-c-status-page-link"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
            data-ouia-component-id="help-panel-status-page-header-button"
          >
            {intl.formatMessage(messages.statusPage)}
          </Button>
        </Title>
        <DrawerActions>
          <DrawerCloseButton
            onClick={toggleDrawer}
            data-ouia-component-id="help-panel-close-button"
          />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <HelpPanelCustomTabs ref={tabsRef} />
      </DrawerPanelBody>
    </>
  );
};

export default HelpPanelContent;
