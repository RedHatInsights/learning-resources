import React from 'react';
import { TextInput } from '@patternfly/react-core';

const KBPanel = ({
  setNewActionTitle,
}: {
  setNewActionTitle: (title: string) => void;
}) => {
  const [searchText, setSearchText] = React.useState('');
  const handleTextInputChange = (_e: unknown, value: string) => {
    setSearchText(value);
    setNewActionTitle(value);
  };
  return (
    <div>
      <h3>Knowledge base</h3>
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
