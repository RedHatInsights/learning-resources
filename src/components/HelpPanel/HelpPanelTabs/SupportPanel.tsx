import React from 'react';
import { TextInput } from '@patternfly/react-core';

const SupportPanel = ({
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
      <h3>My support cases</h3>
      <TextInput
        id="help-panel-support"
        value={searchText}
        onChange={handleTextInputChange}
      />
    </div>
  );
};

export default SupportPanel;
