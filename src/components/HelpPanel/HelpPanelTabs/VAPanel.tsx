import React from 'react';
import { Content, Spinner, Stack, StackItem } from '@patternfly/react-core';
import {
  ScalprumComponent,
  ScalprumComponentProps,
} from '@scalprum/react-core';
import { useIntl } from 'react-intl';
import messages from '../../../Messages';

// Error component that uses internationalized messages
const VAErrorElement: React.FC = () => {
  const intl = useIntl();

  // Log error on render
  console.error('VA Panel: Virtual Assistant module failed to load');

  return (
    <Stack hasGutter className="pf-v6-u-h-100">
      <StackItem>
        <Content>
          {intl.formatMessage(messages.virtualAssistantNotAvailable)}
        </Content>
      </StackItem>
    </Stack>
  );
};

const VAPanel: React.FC<{
  setNewActionTitle: (title: string) => void;
}> = () => {
  const virtualAssistantProps: ScalprumComponentProps & {
    hideHeader?: boolean;
  } = {
    scope: 'virtualAssistant',
    module: './VAEmbed',
    hideHeader: true,
    fallback: (
      <Stack hasGutter className="pf-v6-u-h-100">
        <StackItem
          isFilled
          className="pf-v6-u-display-flex pf-v6-u-justify-content-center pf-v6-u-align-items-center"
        >
          <Spinner size="lg" />
        </StackItem>
      </Stack>
    ),
    ErrorComponent: <VAErrorElement />,
  };

  return (
    <div className="pf-v6-u-h-100 pf-v6-u-display-flex pf-v6-u-flex-direction-column">
      <ScalprumComponent {...virtualAssistantProps} />
    </div>
  );
};

export default VAPanel;
