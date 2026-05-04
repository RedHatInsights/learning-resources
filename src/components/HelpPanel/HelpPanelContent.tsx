import React, { useEffect, useRef } from 'react';
import {
  Button,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import { useFlag } from '@unleash/proxy-client-react';
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
  const isEnvironmentEnabled = useFlag(
    'platform.learning-resources.environment.enabled'
  );
  const tabsRef = useRef<HelpPanelCustomTabsRef>(null);

  // Open a new tab if newTab prop is provided
  useEffect(() => {
    if (newTab && tabsRef.current) {
      tabsRef.current.openTabWithContent(newTab);
    }
  }, [newTab]);

  const statusPageLink = (
    <Button
      variant="link"
      component="a"
      href="https://status.redhat.com/"
      target="_blank"
      rel="noopener noreferrer"
      isInline
      icon={<ExternalLinkAltIcon />}
      iconPosition="end"
      data-ouia-component-id="help-panel-status-page-fallback-link"
    >
      {intl.formatMessage(messages.statusPage)}
    </Button>
  );

  if (!isEnvironmentEnabled) {
    return (
      <>
        <DrawerHead>
          <Title headingLevel="h2" data-ouia-component-id="help-panel-title">
            Help
          </Title>
          <DrawerActions>
            <DrawerCloseButton
              onClick={toggleDrawer}
              data-ouia-component-id="help-panel-close-button"
            />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
          <Content
            component="p"
            data-ouia-component-id="help-panel-not-available"
          >
            {intl.formatMessage(messages.helpPanelNotAvailable, {
              statusPageLink,
            })}
          </Content>
        </DrawerPanelBody>
      </>
    );
  }

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
