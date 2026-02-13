import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { useIntl } from 'react-intl';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import Fuse from 'fuse.js';
import messages from '../../../../Messages';
import fetchAllData from '../../../../utils/fetchAllData';
import {
  fetchBundleInfo,
  fetchBundles,
} from '../../../../utils/fetchBundleInfoAPI';
import { getBundleDisplayName } from '../../../../utils/bundleUtils';
import SearchResultItem, { SearchResult } from './SearchResultItem';
import SearchForm from './SearchForm';
import SearchResults from './SearchResults';

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Create Fuse.js search index for fuzzy searching
const createSearchIndex = (data: SearchResult[]) => {
  return new Fuse(data, {
    keys: [
      { name: 'title', weight: 1.0 },
      { name: 'description', weight: 0.7 },
      { name: 'tags', weight: 0.5 },
    ],
    threshold: 0.3,
    includeScore: true,
  });
};

const SearchPanel = ({
  setNewActionTitle,
}: {
  setNewActionTitle: (title: string) => void;
}) => {
  const intl = useIntl();
  const chrome = useChrome();

  // Search state
  const [searchText, setSearchText] = useState('');
  const [rawSearchResults, setRawSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentQueries, setRecentQueries] = useState<
    { query: string; resultCount: number }[]
  >([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filter state
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Recommended content state
  const [activeToggle, setActiveToggle] = useState<string>('bundle'); // Default to bundle context
  const [recommendedContent, setRecommendedContent] = useState<SearchResult[]>(
    []
  );
  const [bundleTitle, setBundleTitle] = useState<string>('');
  const [bundleId, setBundleId] = useState<string>('');

  // Get current bundle context on component mount
  useEffect(() => {
    const loadBundleData = async () => {
      try {
        // FIXME: Add missing type to the types lib
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { bundleTitle: currentBundleTitle, bundleId: currentBundleId } =
          chrome.getBundleData();
        setBundleTitle(currentBundleTitle);
        setBundleId(currentBundleId);
      } catch (error) {
        console.error('Failed to load bundle data:', error);
      }
    };

    loadBundleData();
  }, [chrome]);

  const isHomePage =
    !bundleTitle ||
    bundleTitle.toLowerCase() === 'home' ||
    bundleTitle.toLowerCase() === 'landing';
  const displayBundleName = bundleId ? getBundleDisplayName(bundleId) : '';

  // Filter options
  const filterOptions = [
    { value: 'services', label: 'Services' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'quickstart', label: 'Quick starts' },
    { value: 'kb', label: 'Knowledgebase' },
    { value: 'api', label: 'API Documentation' },
    { value: 'support', label: 'Support cases' },
  ];

  const debouncedSearchText = useDebounce(searchText, 500);

  // Client-side filtered results (no API call needed)
  const filteredSearchResults = useMemo(() => {
    if (selectedFilters.length === 0) {
      return rawSearchResults;
    }

    return rawSearchResults.filter((result) => {
      return selectedFilters.some((filter) => {
        switch (filter) {
          case 'documentation':
            return result.type === 'documentation';
          case 'quickstart':
            return result.type === 'quickstart';
          case 'api':
            return result.type === 'api';
          case 'kb':
            return result.type === 'kb';
          case 'support':
            return result.type === 'support';
          case 'services':
            return result.type === 'service';
          default:
            return false;
        }
      });
    });
  }, [rawSearchResults, selectedFilters]);

  // Reset page when search text or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchText, selectedFilters]);

  // Load recent search queries from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('help-panel-recent-queries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Handle both old format (string[]) and new format ({query, resultCount}[])
          const formatted = parsed.map((item) =>
            typeof item === 'string' ? { query: item, resultCount: 0 } : item
          );
          setRecentQueries(formatted);
        }
      } catch (error) {
        console.error(
          'Failed to parse recent queries from localStorage:',
          error
        );
        localStorage.removeItem('help-panel-recent-queries');
      }
    }
  }, []);

  const saveRecentQuery = (query: string, resultCount: number) => {
    const filtered = recentQueries.filter((q) => q.query !== query);
    const updated = [{ query, resultCount }, ...filtered].slice(0, 3);
    setRecentQueries(updated);
    localStorage.setItem('help-panel-recent-queries', JSON.stringify(updated));
  };

  const performSearch = async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      // Load learning resources
      const [, quickStarts] = await fetchAllData(chrome.auth.getUser, {});

      // Load API documentation
      const [bundleInfo, bundles] = await Promise.all([
        fetchBundleInfo(),
        fetchBundles(),
      ]);

      const apiDocs = bundleInfo.map((bundleInfo) => {
        const services = bundleInfo.bundleLabels.map((bundleLabel) => {
          const matchingBundle = bundles.find(
            (bundle) => bundle.id === bundleLabel
          );
          return matchingBundle ? matchingBundle.title : bundleLabel;
        });

        return {
          name: bundleInfo.frontendName,
          services,
          url: bundleInfo.url,
        };
      });

      // Convert to searchable results
      const results: SearchResult[] = [];

      // Learning resources
      quickStarts.forEach((resource) => {
        const bundleTags =
          resource.metadata.tags
            ?.filter((tag) => tag.kind === 'bundle')
            .map((tag) => tag.value) || [];

        results.push({
          id: `lr-${resource.metadata.name}`,
          title: resource.spec.displayName,
          description: resource.spec.description || '',
          type: resource.metadata.externalDocumentation
            ? 'documentation'
            : 'quickstart',
          url: resource.spec.link?.href,
          tags: resource.metadata.tags?.map((tag) => tag.value) || [],
          bundleTags: bundleTags,
        });
      });

      // HCC Services
      bundles.forEach((bundle) => {
        bundle.navItems.forEach((navItem) => {
          results.push({
            id: `service-${navItem.appId}`,
            title: navItem.title,
            description: `${bundle.title} service`,
            type: 'service',
            url: navItem.href,
            tags: [bundle.title, bundle.id],
            // Services don't show bundle tags - they're already categorized as services
          });
        });
      });

      // API documentation
      apiDocs.forEach((apiDoc, index) => {
        results.push({
          id: `api-${index}`,
          title: apiDoc.name,
          description: `API documentation for ${apiDoc.services.join(', ')}`,
          type: 'api',
          url: apiDoc.url,
          tags: apiDoc.services,
        });
      });

      // Apply Fuse.js fuzzy search
      const fuse = createSearchIndex(results);
      const searchResults = fuse.search(query);

      // Convert Fuse.js results back to SearchResult format with scores
      const filteredResults = searchResults.map((fuseResult) => ({
        ...fuseResult.item,
        relevanceScore: fuseResult.score ? (1 - fuseResult.score) * 100 : 0, // Convert Fuse score to 0-100 range
      }));

      return filteredResults;
    } catch (error) {
      console.error('Failed to search data:', error);
      return [];
    }
  };

  // Get recommended content based on toggle and bundle context
  const getRecommendedContent = async (): Promise<SearchResult[]> => {
    try {
      const [, quickStarts] = await fetchAllData(chrome.auth.getUser, {});

      let filteredResources = quickStarts;

      // Filter by bundle if bundle toggle is active and not on home page
      if (activeToggle === 'bundle' && !isHomePage && bundleId) {
        filteredResources = filteredResources.filter((resource) =>
          resource.metadata.tags?.some(
            (tag) => tag.kind === 'bundle' && tag.value === bundleId
          )
        );
      }

      // Convert to SearchResult format and limit to 5 items
      const recommendedResults: SearchResult[] = filteredResources
        .slice(0, 5) // Limit to 5 curated pieces
        .map((resource) => {
          const bundleTags =
            resource.metadata.tags
              ?.filter((tag) => tag.kind === 'bundle')
              .map((tag) => tag.value) || [];

          return {
            id: `lr-${resource.metadata.name}`,
            title: resource.spec.displayName,
            description: resource.spec.description || '',
            type: resource.metadata.externalDocumentation
              ? 'documentation'
              : 'quickstart',
            url: resource.spec.link?.href,
            tags: resource.metadata.tags?.map((tag) => tag.value) || [],
            bundleTags: bundleTags,
          };
        });

      return recommendedResults;
    } catch (error) {
      console.error('Failed to get recommended content:', error);
      return [];
    }
  };

  // Perform search
  useEffect(() => {
    if (!debouncedSearchText.trim()) {
      setRawSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);

    const executeSearch = async () => {
      try {
        const filteredResults = await performSearch(debouncedSearchText);
        setRawSearchResults(filteredResults);

        // Save query to recent searches when search is performed and has results
        if (filteredResults.length > 0) {
          saveRecentQuery(debouncedSearchText.trim(), filteredResults.length);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setRawSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    executeSearch();
  }, [debouncedSearchText]);

  // Load recommended content when toggle changes
  useEffect(() => {
    const loadRecommendedContent = async () => {
      const content = await getRecommendedContent();
      setRecommendedContent(content);
    };

    loadRecommendedContent();
  }, [activeToggle, bundleId]);

  // Handlers
  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setNewActionTitle(value);
  };

  const handleClear = () => {
    setSearchText('');
    setNewActionTitle('');
  };

  const handleClearSearchHistory = () => {
    setRecentQueries([]);
    localStorage.removeItem('help-panel-recent-queries');
  };

  const handleSetPage = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handlePerPageSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    newPerPage: number,
    newPage: number
  ) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const handleFilterToggle = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterSelect = (value: string) => {
    setSelectedFilters((prev) => {
      const isSelected = prev.includes(value);
      if (isSelected) {
        return prev.filter((filter) => filter !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  const handleFilterChipRemove = (filterToRemove: string) => {
    setSelectedFilters((prev) =>
      prev.filter((filter) => filter !== filterToRemove)
    );
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
  };

  const handleRecentQueryClick = (query: string) => {
    setSearchText(query);
    setNewActionTitle(query);
  };

  const handleToggleChange = (
    _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
    isSelected: boolean,
    value: string
  ) => {
    if (isSelected) {
      setActiveToggle(value);
    }
  };

  return (
    <Stack
      hasGutter
      className="pf-v6-u-h-100"
      data-ouia-component-id="help-panel-search-root"
    >
      {/* Search Form */}
      <StackItem>
        <SearchForm
          searchText={searchText}
          onSearchChange={handleSearchChange}
          onClear={handleClear}
          selectedFilters={selectedFilters}
          onFilterSelect={handleFilterSelect}
          onFilterChipRemove={handleFilterChipRemove}
          onClearAllFilters={clearAllFilters}
          isFilterOpen={isFilterOpen}
          onFilterToggle={handleFilterToggle}
          setIsFilterOpen={setIsFilterOpen}
          filterOptions={filterOptions}
        />
      </StackItem>

      <StackItem>
        <Content>{intl.formatMessage(messages.searchPanelDescription)}</Content>
      </StackItem>

      {/* Recent Search Queries */}
      {!searchText && (
        <>
          <StackItem>
            <Stack hasGutter={false}>
              <StackItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>
                    <Content component="h4">
                      {intl.formatMessage(messages.searchPanelRecentSearch)}
                    </Content>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="link"
                      onClick={handleClearSearchHistory}
                      aria-label="Clear search history"
                    >
                      {intl.formatMessage(messages.clearSearchHistoryText)}
                    </Button>
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                {recentQueries.length > 0 ? (
                  <DataList aria-label="Recent search queries" isCompact>
                    {recentQueries.map((queryObj, index) => (
                      <DataListItem key={`${queryObj.query}-${index}`}>
                        <DataListItemRow>
                          <DataListItemCells
                            dataListCells={[
                              <DataListCell key="query" isFilled>
                                <Flex
                                  alignItems={{ default: 'alignItemsCenter' }}
                                  spaceItems={{ default: 'spaceItemsSm' }}
                                >
                                  <FlexItem>
                                    <Button
                                      variant="link"
                                      onClick={() =>
                                        handleRecentQueryClick(queryObj.query)
                                      }
                                      className="pf-v6-u-text-align-left pf-v6-u-p-0 pf-v6-u-font-size-md pf-v6-u-text-decoration-none pf-v6-u-color-link"
                                    >
                                      {queryObj.query}
                                    </Button>
                                  </FlexItem>
                                  <FlexItem>
                                    <Content
                                      component="small"
                                      className="pf-v6-u-color-200"
                                    >
                                      {queryObj.resultCount}{' '}
                                      {queryObj.resultCount === 1
                                        ? intl.formatMessage(
                                            messages.searchResultSingular
                                          )
                                        : intl.formatMessage(
                                            messages.searchResultPlural
                                          )}
                                    </Content>
                                  </FlexItem>
                                </Flex>
                              </DataListCell>,
                            ]}
                          />
                        </DataListItemRow>
                      </DataListItem>
                    ))}
                  </DataList>
                ) : (
                  <>
                    <Content
                      component="small"
                      className="pf-v6-u-color-200 pf-v6-u-text-align-center pf-v6-u-mt-md"
                    >
                      {intl.formatMessage(messages.noRecentSearchesText)}
                    </Content>
                  </>
                )}
              </StackItem>
            </Stack>
          </StackItem>
        </>
      )}

      {/* Recommended content section */}
      {!searchText && (
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Content component="h4">
                    {intl.formatMessage(messages.searchPanelRecommendedContent)}
                  </Content>
                </FlexItem>
                {!isHomePage && (
                  <FlexItem>
                    <ToggleGroup
                      isCompact
                      aria-label={intl.formatMessage(
                        messages.filterByScopeAriaLabel
                      )}
                      data-ouia-component-id="help-panel-recommended-scope-toggle"
                    >
                      <ToggleGroupItem
                        text={intl.formatMessage(messages.allToggleText)}
                        buttonId="recommended-all-toggle"
                        isSelected={activeToggle === 'all'}
                        onChange={(event, isSelected) =>
                          handleToggleChange(event, isSelected, 'all')
                        }
                        data-ouia-component-id="help-panel-recommended-scope-toggle-all"
                      />
                      <ToggleGroupItem
                        text={displayBundleName}
                        buttonId="recommended-bundle-toggle"
                        isSelected={activeToggle === 'bundle'}
                        onChange={(event, isSelected) =>
                          handleToggleChange(event, isSelected, 'bundle')
                        }
                        data-ouia-component-id="help-panel-recommended-scope-toggle-bundle"
                      />
                    </ToggleGroup>
                  </FlexItem>
                )}
              </Flex>
            </StackItem>
            <StackItem>
              {recommendedContent.length > 0 ? (
                <DataList aria-label="Recommended content" isCompact>
                  {recommendedContent.map((content) => (
                    <DataListItem key={content.id}>
                      <DataListItemRow>
                        <DataListItemCells
                          dataListCells={[
                            <DataListCell key="content" isFilled>
                              <SearchResultItem result={content} />
                            </DataListCell>,
                          ]}
                        />
                      </DataListItemRow>
                    </DataListItem>
                  ))}
                </DataList>
              ) : (
                <Content
                  component="small"
                  className="pf-v6-u-color-200 pf-v6-u-text-align-center pf-v6-u-mt-md"
                >
                  {intl.formatMessage(messages.noRecommendedContentMessage)}
                </Content>
              )}
            </StackItem>
          </Stack>
        </StackItem>
      )}

      {/* Search Results */}
      {searchText && (
        <StackItem isFilled className="pf-v6-u-overflow-hidden">
          <SearchResults
            searchText={searchText}
            isSearching={isSearching}
            filteredSearchResults={filteredSearchResults}
            page={page}
            perPage={perPage}
            onSetPage={handleSetPage}
            onPerPageSelect={handlePerPageSelect}
            bundleId={bundleId}
            bundleTitle={bundleTitle}
            isHomePage={isHomePage}
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default SearchPanel;
