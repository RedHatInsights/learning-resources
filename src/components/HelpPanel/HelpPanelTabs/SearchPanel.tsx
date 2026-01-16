import React from 'react';
import { Stack, StackItem, TextInput } from '@patternfly/react-core';
import { useIntl } from 'react-intl';
import messages from '../../../Messages';

const SearchPanel = ({
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
    <Stack
      hasGutter
      className="pf-v6-u-h-100"
      data-ouia-component-id="help-panel-search-root"
    >
      <StackItem>
        <TextInput
          id="help-panel-search"
          placeholder={intl.formatMessage(messages.searchPanelPlaceholder)}
          value={searchText}
          onChange={handleTextInputChange}
          data-ouia-component-id="help-panel-search-input"
        />
      </StackItem>
      <StackItem>
        {intl.formatMessage(messages.searchPanelDescription)}
      </StackItem>
      <StackItem>
        {intl.formatMessage(messages.searchPanelRecentSearch)}
      </StackItem>
    </Stack>
  );
};

export default SearchPanel;
