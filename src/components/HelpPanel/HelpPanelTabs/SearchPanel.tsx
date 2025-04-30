import React from 'react';
import { TextInput } from '@patternfly/react-core';

const SearchPanel = ({
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
      <h3>Search</h3>
      <TextInput
        id="help-panel-search"
        value={searchText}
        onChange={handleTextInputChange}
      />
    </div>
  );
};

export default SearchPanel;
