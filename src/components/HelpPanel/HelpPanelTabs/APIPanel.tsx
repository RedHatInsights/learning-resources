import React from 'react';
import { TextInput } from '@patternfly/react-core';

const APIPanel = ({
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
      <h3>APIs</h3>
      <TextInput
        id="help-panel-api"
        value={searchText}
        onChange={handleTextInputChange}
      />
    </div>
  );
};

export default APIPanel;
