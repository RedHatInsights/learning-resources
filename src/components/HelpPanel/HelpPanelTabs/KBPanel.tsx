import React from 'react';
import { TextInput } from '@patternfly/react-core';
import { useIntl } from 'react-intl';
import messages from '../../../Messages';

const KBPanel = ({
  setNewActionTitle,
}: {
  setNewActionTitle: (title: string) => void;
}) => {
  const intl = useIntl();
  const [searchText, setSearchText] = React.useState('');
  const handleTextInputChange = (_e: unknown, value: string) => {
    setSearchText(value);
    setNewActionTitle(value);
  };
  return (
    <div>
      <h3>{intl.formatMessage(messages.knowledgeBaseTitle)}</h3>
      <TextInput
        id="help-panel-kb"
        value={searchText}
        onChange={handleTextInputChange}
        data-ouia-component-id="help-panel-kb-input"
      />
    </div>
  );
};

export default KBPanel;
