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
    <Stack className="pf-v6-u-h-100 pf-v6-u-p-md">
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
  const virtualAssistantProps: ScalprumComponentProps = {
    scope: 'virtualAssistant',
    module: './VAEmbed',
    fallback: (
      <div className="pf-v6-u-h-100 pf-v6-u-display-flex pf-v6-u-justify-content-center pf-v6-u-align-items-center">
        <Spinner size="lg" />
      </div>
    ),
    ErrorComponent: <VAErrorElement />,
  };

  return (
    <div className="pf-v6-u-h-100">
      <ScalprumComponent {...virtualAssistantProps} />
    </div>
  );
};

export default VAPanel;
