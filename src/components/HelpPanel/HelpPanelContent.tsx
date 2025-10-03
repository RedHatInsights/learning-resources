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
import { useFlag } from '@unleash/proxy-client-react';
import HelpPanelCustomTabs from './HelpPanelCustomTabs';
import { AskRedHatIcon } from '../common/AskRedHatIcon';

const HelpPanelContent = ({ toggleDrawer }: { toggleDrawer: () => void }) => {
  const searchFlag = useFlag('platform.chrome.help-panel_search');
  const kbFlag = useFlag('platform.chrome.help-panel_knowledge-base');

  const showStatusPageInHeader = searchFlag && kbFlag;

  return (
    <>
      <DrawerHead>
        <Title headingLevel="h2">
          Help
          {showStatusPageInHeader && (
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
          )}
        </Title>
        <DrawerActions>
          <Button
            variant="link"
            component="a"
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
