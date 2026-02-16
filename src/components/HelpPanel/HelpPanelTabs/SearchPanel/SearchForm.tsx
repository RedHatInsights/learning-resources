import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import messages from '../../../../Messages';

interface FilterOption {
  value: string;
  label: string;
}

interface SearchFormProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  selectedFilters: string[];
  onFilterSelect: (value: string) => void;
  onFilterChipRemove: (filter: string) => void;
  onClearAllFilters: () => void;
  isFilterOpen: boolean;
  onFilterToggle: () => void;
  setIsFilterOpen: (isOpen: boolean) => void;
  filterOptions: FilterOption[];
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchText,
  onSearchChange,
  onClear,
  selectedFilters,
  onFilterSelect,
  onFilterChipRemove,
  onClearAllFilters,
  isFilterOpen,
  onFilterToggle,
  setIsFilterOpen,
  filterOptions,
}) => {
  const intl = useIntl();

  const handleTextInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    onSearchChange(value);
  };

  return (
    <>
      {/* Search input with filter dropdown */}
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem flex={{ default: 'flex_1' }}>
          <SearchInput
            id="help-panel-search"
            placeholder={intl.formatMessage(messages.searchPanelPlaceholder)}
            value={searchText}
            onChange={handleTextInputChange}
            onClear={onClear}
            data-ouia-component-id="help-panel-search-input"
          />
        </FlexItem>
        {searchText && (
          <FlexItem>
            <Select
              role="menu"
              isOpen={isFilterOpen}
              selected={selectedFilters}
              onSelect={(_event, value) => onFilterSelect(value as string)}
              onOpenChange={setIsFilterOpen}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={onFilterToggle}
                  icon={<FilterIcon />}
                >
                  {intl.formatMessage(messages.contentTypeLabel)}
                </MenuToggle>
              )}
            >
              <SelectList>
                {filterOptions.map((option) => (
                  <SelectOption
                    key={option.value}
                    value={option.value}
                    hasCheckbox
                    isSelected={selectedFilters.includes(option.value)}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FlexItem>
        )}
      </Flex>

      {/* Filter chips */}
      {selectedFilters.length > 0 && (
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          {selectedFilters.map((filter) => {
            const filterOption = filterOptions.find(
              (option) => option.value === filter
            );
            return (
              <FlexItem key={filter}>
                <Label
                  variant="outline"
                  isCompact
                  onClose={() => onFilterChipRemove(filter)}
                >
                  {filterOption?.label || filter}
                </Label>
              </FlexItem>
            );
          })}
          <FlexItem>
            <Button
              variant="link"
              onClick={onClearAllFilters}
              isInline
              className="pf-v6-u-font-size-sm"
            >
              {intl.formatMessage(messages.clearAllFiltersText)}
            </Button>
          </FlexItem>
        </Flex>
      )}
    </>
  );
};

export default SearchForm;
