import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  Pagination,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { suspenseLoader as useSuspenseLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import fetchAllData from '../../../utils/fetchAllData';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';
import {
  BookmarkedIcon,
  OutlinedBookmarkedIcon,
} from '../../common/BookmarkIcon';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import axios from 'axios';
import { API_BASE, FAVORITES } from '../../../hooks/useQuickStarts';
import { FiltersMetadata } from '../../../utils/FiltersCategoryInterface';

const CONTENT_TYPE_OPTIONS = [
  { value: 'documentation', label: 'Documentation' },
  { value: 'quickstart', label: 'Quick starts' },
  { value: 'learningPath', label: 'Learning paths' },
  { value: 'otherResource', label: 'Other' },
];

// Bundle name mapping to get abbreviated names
const getBundleDisplayName = (bundleValue: string): string => {
  const fullName = FiltersMetadata[bundleValue];
  if (!fullName)
    return bundleValue.charAt(0).toUpperCase() + bundleValue.slice(1);

  // Extract abbreviated name by taking the part before parentheses
  return fullName.split(' (')[0];
};

// Learning Resource Item Component
const LearningResourceItem: React.FC<{
  resource: ExtendedQuickstart;
  onBookmarkToggle: (resource: ExtendedQuickstart) => void;
}> = ({ resource, onBookmarkToggle }) => {
  const chrome = useChrome();
  const [isBookmarked, setIsBookmarked] = useState(resource.metadata.favorite);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const user = await chrome.auth.getUser();
      if (!user) {
        throw new Error('User not logged in');
      }
      const account = user.identity.internal?.account_id;

      setIsBookmarked(!isBookmarked);
      await axios.post(`${API_BASE}/${FAVORITES}?account=${account}`, {
        quickstartName: resource.metadata.name,
        favorite: !isBookmarked,
      });
      onBookmarkToggle(resource);
    } catch (error) {
      setIsBookmarked(resource.metadata.favorite);
    }
  };

  const handleResourceClick = () => {
    if (resource.spec.type?.text === 'Quick start') {
      chrome.quickStarts.activateQuickstart(resource.metadata.name);
    } else if (resource.spec.link?.href) {
      window.open(resource.spec.link.href, '_blank');
    }
  };

  const bundleTags =
    resource.metadata.tags?.filter((tag) => tag.kind === 'bundle') || [];

  return (
    <Flex
      alignItems={{ default: 'alignItemsFlexStart' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem>
        <Button
          variant="plain"
          onClick={handleBookmarkClick}
          icon={
            isBookmarked ? (
              <BookmarkedIcon />
            ) : (
              <OutlinedBookmarkedIcon className="pf-v6-t-color-100" />
            )
          }
        />
      </FlexItem>

      <FlexItem flex={{ default: 'flex_1' }}>
        <Stack hasGutter={false}>
          <StackItem>
            <Button
              variant="link"
              onClick={handleResourceClick}
              isInline
              className="pf-v6-u-text-align-left pf-v6-u-p-0"
            >
              {resource.spec.displayName}
              {resource.spec.link?.href &&
                resource.spec.type?.text !== 'Quick start' && (
                  <ExternalLinkAltIcon className="pf-v6-u-ml-xs" />
                )}
            </Button>
          </StackItem>
          <StackItem>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <Content component="small">{resource.spec.type?.text}</Content>
              </FlexItem>
              {bundleTags.length > 0 && (
                <FlexItem>
                  <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                    {bundleTags.map((tag, index: number) => (
                      <FlexItem key={index}>
                        <Label color="grey" variant="filled" isCompact>
                          {getBundleDisplayName(tag.value)}
                        </Label>
                      </FlexItem>
                    ))}
                  </Flex>
                </FlexItem>
              )}
            </Flex>
          </StackItem>
        </Stack>
      </FlexItem>
    </Flex>
  );
};

const LearnPanelContent: React.FC<{
  setNewActionTitle: (title: string) => void;
}> = () => {
  const chrome = useChrome();
  const { loader, purgeCache } = useSuspenseLoader(fetchAllData);
  const [isContentTypeOpen, setIsContentTypeOpen] = useState(false);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>(
    []
  );
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [activeToggle, setActiveToggle] = useState<string>('all');
  const [bundleTitle, setBundleTitle] = useState<string>('');
  const [bundleId, setBundleId] = useState<string>('');
  const [allQuickStarts, setAllQuickStarts] = useState<ExtendedQuickstart[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Load data on mount to avoid side effects during render
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get bundle data
        // FIXME: Add missing type to the types lib
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { bundleTitle: currentBundleTitle, bundleId: currentBundleId } =
          chrome.getBundleData();
        setBundleTitle(currentBundleTitle);
        setBundleId(currentBundleId);

        // Load learning resources data
        const [, quickStarts] = await loader(chrome.auth.getUser, {});
        setAllQuickStarts(quickStarts);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load learning resources data:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [chrome, loader]);

  // Check if we're on the home page (no specific bundle context)
  const isHomePage =
    !bundleTitle ||
    bundleTitle.toLowerCase() === 'home' ||
    bundleTitle.toLowerCase() === 'landing';

  const displayBundleName = bundleId ? getBundleDisplayName(bundleId) : '';

  // Filter and process learning resources
  const filteredResources = useMemo(() => {
    let filtered = allQuickStarts;

    // Filter by bundle if not showing all (and not on home page)
    if (activeToggle === 'bundle' && !isHomePage) {
      const currentBundleId = bundleId;
      filtered = filtered.filter((resource: ExtendedQuickstart) => {
        const bundleTag = resource.metadata.tags?.find(
          (tag) => tag.kind === 'bundle'
        );
        return bundleTag?.value === currentBundleId;
      });
    }

    // Filter by content type
    if (selectedContentTypes.length > 0) {
      filtered = filtered.filter((resource: ExtendedQuickstart) => {
        if (
          selectedContentTypes.includes('documentation') &&
          resource.metadata.externalDocumentation
        ) {
          return true;
        }
        if (
          selectedContentTypes.includes('learningPath') &&
          resource.metadata.learningPath
        ) {
          return true;
        }
        if (
          selectedContentTypes.includes('otherResource') &&
          resource.metadata.otherResource
        ) {
          return true;
        }
        if (
          selectedContentTypes.includes('quickstart') &&
          !resource.metadata.externalDocumentation &&
          !resource.metadata.learningPath &&
          !resource.metadata.otherResource
        ) {
          return true;
        }
        return false;
      });
    }

    // Filter by bookmark status
    if (showBookmarkedOnly) {
      filtered = filtered.filter(
        (resource: ExtendedQuickstart) => resource.metadata.favorite
      );
    }

    return filtered;
  }, [
    allQuickStarts,
    activeToggle,
    selectedContentTypes,
    showBookmarkedOnly,
    isHomePage,
    bundleId,
  ]);

  // Paginated resources
  const paginatedResources = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredResources.slice(startIndex, endIndex);
  }, [filteredResources, page, perPage]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeToggle, selectedContentTypes, showBookmarkedOnly, bundleId]);

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

  const handleContentTypeToggle = () => {
    setIsContentTypeOpen(!isContentTypeOpen);
  };

  const handleContentTypeSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    selection: string | number | undefined
  ) => {
    if (typeof selection === 'string') {
      setSelectedContentTypes((prev) => {
        if (prev.includes(selection)) {
          return prev.filter((item) => item !== selection);
        } else {
          return [...prev, selection];
        }
      });
    }
  };

  const handleRemoveContentType = (contentType: string) => {
    setSelectedContentTypes((prev) =>
      prev.filter((item) => item !== contentType)
    );
  };

  const handleBookmarkToggle = (
    _event: React.FormEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setShowBookmarkedOnly(checked);
  };

  const handleToggleChange = (
    _event:
      | React.MouseEvent<MouseEvent>
      | React.KeyboardEvent<Element>
      | MouseEvent,
    isSelected: boolean,
    value: string
  ) => {
    if (isSelected) {
      setActiveToggle(value);
    }
  };

  const handleBookmarkItemToggle = async () => {
    try {
      purgeCache();
      // Reload data after bookmark changes
      const [, quickStarts] = await loader(chrome.auth.getUser, {});
      setAllQuickStarts(quickStarts);
    } catch (error) {
      console.error('Failed to refresh learning resources data:', error);
    }
  };

  const getContentTypeLabel = (value: string) => {
    return (
      CONTENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
      value
    );
  };

  const contentTypeToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={handleContentTypeToggle}
      isExpanded={isContentTypeOpen}
      style={{ width: '100%' }}
    >
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsSm' }}
      >
        <FlexItem>Content type</FlexItem>
        {selectedContentTypes.length > 0 && (
          <FlexItem>
            <Label color="grey" isCompact>
              {selectedContentTypes.length}
            </Label>
          </FlexItem>
        )}
      </Flex>
    </MenuToggle>
  );

  const handleClearAllFilters = () => {
    setSelectedContentTypes([]);
  };

  if (isLoading) {
    return <Spinner size="lg" />;
  }

  return (
    <Stack hasGutter className="pf-v6-u-h-100">
      <StackItem>
        <Content>
          Find product documentation, quick starts, learning paths, and more.
          For a more detailed view, browse the{' '}
          <Button
            variant="link"
            component="a"
            href={`/learning-resources?tab=all`}
            isInline
            iconPosition="end"
          >
            All Learning Catalog
          </Button>
          .
        </Content>
      </StackItem>

      <StackItem>
        <Stack hasGutter={false}>
          <StackItem>
            <Flex>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Select
                  id="content-type-select"
                  isOpen={isContentTypeOpen}
                  toggle={contentTypeToggle}
                  onSelect={handleContentTypeSelect}
                  onOpenChange={setIsContentTypeOpen}
                  shouldFocusToggleOnSelect
                >
                  <SelectList>
                    {CONTENT_TYPE_OPTIONS.map((option) => (
                      <SelectOption
                        key={option.value}
                        value={option.value}
                        hasCheckbox
                        isSelected={selectedContentTypes.includes(option.value)}
                      >
                        {option.label}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </FlexItem>
              <FlexItem>
                <Checkbox
                  id="show-bookmarked-only"
                  label="Show bookmarked only"
                  isChecked={showBookmarkedOnly}
                  onChange={handleBookmarkToggle}
                />
              </FlexItem>
            </Flex>
          </StackItem>

          {/* Filter chips directly below dropdown */}
          {selectedContentTypes.length > 0 && (
            <StackItem className="pf-v6-u-mt-sm">
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                {selectedContentTypes.map((contentType) => (
                  <FlexItem key={contentType}>
                    <Label
                      variant="outline"
                      onClose={() => handleRemoveContentType(contentType)}
                    >
                      {getContentTypeLabel(contentType)}
                    </Label>
                  </FlexItem>
                ))}
                <FlexItem>
                  <Button
                    variant="link"
                    onClick={handleClearAllFilters}
                    isInline
                    className="pf-v6-u-font-size-sm"
                  >
                    Clear all filters
                  </Button>
                </FlexItem>
              </Flex>
            </StackItem>
          )}
        </Stack>
      </StackItem>

      {/* Toolbar with results count and toggle group */}
      <StackItem>
        <Toolbar id="learning-resources-results-toolbar">
          <ToolbarContent>
            <ToolbarItem>
              <Content>Learning resources ({filteredResources.length})</Content>
            </ToolbarItem>
            <ToolbarItem>
              {!isHomePage && (
                <ToggleGroup aria-label="Filter by scope">
                  <ToggleGroupItem
                    text="All"
                    buttonId="all-toggle"
                    isSelected={activeToggle === 'all'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'all')
                    }
                  />
                  <ToggleGroupItem
                    text={displayBundleName}
                    buttonId="bundle-toggle"
                    isSelected={activeToggle === 'bundle'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'bundle')
                    }
                  />
                </ToggleGroup>
              )}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </StackItem>

      {/* Learning resources list with PatternFly List component */}
      <StackItem isFilled className="pf-v6-u-overflow-hidden">
        <div className="pf-v6-u-h-100 pf-v6-u-overflow-y-auto">
          {filteredResources.length > 0 ? (
            <DataList aria-label="Learning resources">
              {paginatedResources.map((resource: ExtendedQuickstart) => (
                <DataListItem key={resource.metadata.name}>
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="resource-content" isFilled>
                          <LearningResourceItem
                            resource={resource}
                            onBookmarkToggle={handleBookmarkItemToggle}
                          />
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
              ))}
            </DataList>
          ) : (
            <Content>
              <p>No learning resources found matching your criteria.</p>
            </Content>
          )}
        </div>
      </StackItem>

      {/* Pagination */}
      {filteredResources.length > 0 && (
        <StackItem>
          <Pagination
            itemCount={filteredResources.length}
            perPage={perPage}
            page={page}
            onSetPage={handleSetPage}
            onPerPageSelect={handlePerPageSelect}
            isCompact
          />
        </StackItem>
      )}
    </Stack>
  );
};

const LearnPanel = ({
  setNewActionTitle,
}: {
  setNewActionTitle: (title: string) => void;
}) => {
  return (
    <Suspense fallback={<Spinner size="lg" />}>
      <LearnPanelContent setNewActionTitle={setNewActionTitle} />
    </Suspense>
  );
};

export default LearnPanel;
