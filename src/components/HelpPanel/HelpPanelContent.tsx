import React, { Dispatch, SetStateAction } from 'react';
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
import { useIntl } from 'react-intl';
import HelpPanelCustomTabs from './HelpPanelCustomTabs';
import { AiExperienceIcon } from '../common/AiExperienceIcon';
import { useLoadModule, useRemoteHook } from '@scalprum/react-core';
import messages from '../../Messages';

export type VirtualAssistantState = {
  isOpen?: boolean;
  currentModel?: string;
};

export type ModelsType = {
  ASK_RED_HAT: string;
};

const HelpPanelContent = ({
  toggleDrawer,
  Models,
  setVirtualAssistantState,
}: {
  toggleDrawer: () => void;
  Models?: ModelsType;
  setVirtualAssistantState?: Dispatch<SetStateAction<VirtualAssistantState>>;
}) => {
  const intl = useIntl();
  const searchFlag = useFlag('platform.chrome.help-panel_search');
  const kbFlag = useFlag('platform.chrome.help-panel_knowledge-base');
  const askRH = useFlag('platform.chrome.help-panel_direct-ask-redhat');

  const showStatusPageInHeader = searchFlag && kbFlag;

  return (
    <>
      <DrawerHead>
        <Title headingLevel="h2" data-ouia-component-id="help-panel-title">
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
              data-ouia-component-id="help-panel-status-page-header-button"
            >
              {intl.formatMessage(messages.redHatStatusPage)}
            </Button>
          )}
        </Title>
        <DrawerActions>
          {askRH ? (
            <Button
              variant="link"
              component="button"
              onClick={() => {
                setVirtualAssistantState?.({
                  isOpen: true,
                  currentModel: Models?.ASK_RED_HAT,
                });
              }}
              className="pf-v6-u-align-items-flex-start"
              icon={<AiExperienceIcon width={20} height={20} />}
              data-ouia-component-id="help-panel-ask-red-hat-button"
            >
              {intl.formatMessage(messages.chatWithAssistant)}
            </Button>
          ) : (
            <Button
              variant="link"
              component="a"
              className="pf-v6-u-align-items-flex-start"
              href="https://access.redhat.com/ask"
              target="_blank"
              rel="noopener noreferrer"
              icon={<AiExperienceIcon width={20} height={20} />}
              data-ouia-component-id="help-panel-ask-red-hat-button"
            >
              {intl.formatMessage(messages.chatWithAssistant)}
            </Button>
          )}
          <DrawerCloseButton
            onClick={toggleDrawer}
            data-ouia-component-id="help-panel-close-button"
          />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <HelpPanelCustomTabs />
      </DrawerPanelBody>
    </>
  );
};

const HelpPanelContentWrapper = (props: { toggleDrawer: () => void }) => {
  const { hookResult, loading } = useRemoteHook<
    [unknown, Dispatch<SetStateAction<VirtualAssistantState>>]
  >({
    scope: 'virtualAssistant',
    module: './state/globalState',
    importName: 'useVirtualAssistant',
  });

  const [module] = useLoadModule(
    {
      scope: 'virtualAssistant',
      module: './state/globalState',
      importName: 'Models',
    },
    {}
  );

  if (loading || !module) {
    return 'Loading...';
  }

  const Models = module as ModelsType;

  const [, setState] = hookResult || [];
  return (
    <HelpPanelContent
      {...props}
      Models={Models}
      {...(setState && { setVirtualAssistantState: setState })}
    />
  );
};

export default HelpPanelContentWrapper;
