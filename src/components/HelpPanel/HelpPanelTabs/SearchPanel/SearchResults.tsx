import React, { useMemo, useState } from 'react';
import {
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Pagination,
  Spinner,
  Stack,
  StackItem,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import SearchResultItem, { SearchResult } from './SearchResultItem';
import messages from '../../../../Messages';
import { getBundleDisplayName } from '../../../../utils/bundleUtils';

interface SearchResultsProps {
  searchText: string;
  isSearching: boolean;
  filteredSearchResults: SearchResult[];
  page: number;
  perPage: number;
  onSetPage: (
    event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPage: number
  ) => void;
  onPerPageSelect: (
    event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPerPage: number,
    newPage: number
  ) => void;
  // Bundle context props
  bundleId?: string;
  bundleTitle?: string;
  isHomePage?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchText,
  isSearching,
  filteredSearchResults,
  page,
  perPage,
  onSetPage,
  onPerPageSelect,
  bundleId,
  isHomePage,
}) => {
  const intl = useIntl();
  const [activeToggle, setActiveToggle] = useState<string>('all');

  // Bundle filtered and paginated search results
  const bundleFilteredResults = useMemo(() => {
    if (activeToggle === 'all' || !bundleId || isHomePage) {
      return filteredSearchResults;
    }

    // Filter by bundle for learning resources only
    // Services are cross-product and should only appear in "All" view
    return filteredSearchResults.filter((result) => {
      // Exclude services from bundle-specific view
      if (result.type === 'service') {
        return false;
      }
      return result.bundleTags?.some(
        (tag) => tag.toLowerCase() === bundleId.toLowerCase()
      );
    });
  }, [filteredSearchResults, activeToggle, bundleId, isHomePage]);

  const paginatedResults = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return bundleFilteredResults.slice(startIndex, endIndex);
  }, [bundleFilteredResults, page, perPage]);

  const handleToggleChange = (
    event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    isSelected: boolean,
    value: string
  ) => {
    if (isSelected) {
      setActiveToggle(value);
      // Reset to page 1 when toggle changes
      onSetPage(event, 1);
    }
  };

  const displayBundleName = bundleId
    ? getBundleDisplayName(bundleId, { allowFallback: true })
    : '';

  if (!searchText) {
    return null;
  }

  return (
    <Stack hasGutter className="pf-v6-u-h-100">
      <StackItem>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem>
            <Content component="h4">
              {intl.formatMessage(messages.searchResultsHeader)}
            </Content>
          </FlexItem>
          {!isHomePage && bundleId && (
            <FlexItem>
              <ToggleGroup
                isCompact
                aria-label={intl.formatMessage(
                  messages.searchScopeToggleAriaLabel
                )}
                data-ouia-component-id="help-panel-search-scope-toggle"
              >
                <ToggleGroupItem
                  text={intl.formatMessage(messages.allToggleText)}
                  buttonId="search-all-toggle"
                  isSelected={activeToggle === 'all'}
                  onChange={(event, isSelected) =>
                    handleToggleChange(event, isSelected, 'all')
                  }
                  data-ouia-component-id="help-panel-search-scope-toggle-all"
                />
                <ToggleGroupItem
                  text={displayBundleName}
                  buttonId="search-bundle-toggle"
                  isSelected={activeToggle === 'bundle'}
                  onChange={(event, isSelected) =>
                    handleToggleChange(event, isSelected, 'bundle')
                  }
                  data-ouia-component-id="help-panel-search-scope-toggle-bundle"
                />
              </ToggleGroup>
            </FlexItem>
          )}
        </Flex>
      </StackItem>
      <StackItem isFilled className="pf-v6-u-overflow-hidden">
        <div className="pf-v6-u-h-100 pf-v6-u-overflow-y-auto">
          {isSearching ? (
            <Flex
              justifyContent={{ default: 'justifyContentCenter' }}
              className="pf-v6-u-p-md"
            >
              <Spinner size="lg" />
            </Flex>
          ) : bundleFilteredResults.length > 0 ? (
            <>
              <DataList
                key={`${activeToggle}-${bundleFilteredResults.length}`}
                aria-label="Search results"
              >
                {paginatedResults.map((result) => (
                  <DataListItem key={result.id}>
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="content" isFilled>
                            <SearchResultItem result={result} />
                          </DataListCell>,
                        ]}
                      />
                    </DataListItemRow>
                  </DataListItem>
                ))}
              </DataList>
              {bundleFilteredResults.length > perPage && (
                <div className="pf-v6-u-mt-md">
                  <Pagination
                    itemCount={bundleFilteredResults.length}
                    perPage={perPage}
                    page={page}
                    onSetPage={onSetPage}
                    onPerPageSelect={onPerPageSelect}
                    isCompact
                    data-ouia-component-id="help-panel-search-pagination"
                  />
                </div>
              )}
            </>
          ) : (
            <EmptyState variant={EmptyStateVariant.sm}>
              <SearchIcon />
              <Title headingLevel="h4" size="lg">
                {intl.formatMessage(messages.noResultsFoundTitle)}
              </Title>
              <EmptyStateBody>
                {intl.formatMessage(messages.noResultsFoundDescription)}
              </EmptyStateBody>
            </EmptyState>
          )}
        </div>
      </StackItem>
    </Stack>
  );
};

export default SearchResults;
