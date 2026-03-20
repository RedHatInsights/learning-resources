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
  Label,
  Pagination,
  SearchInput,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import messages from '../../../Messages';
import { bundleRecommendedContent } from './SearchPanel/recommendedContentConfig';

// Knowledgebase article interface
interface KnowledgebaseArticle {
  id: string;
  title: string;
  url: string;
  bundleTags?: string[];
  lastModifiedDate?: string;
}

/**
 * Extract all KB articles from the recommended content config
 * Deduplicates by URL and merges bundleTags
 */
const getAllKBArticles = (): KnowledgebaseArticle[] => {
  const articlesByUrl = new Map<string, KnowledgebaseArticle>();

  // Iterate through all bundles in the config
  Object.entries(bundleRecommendedContent).forEach(([, items]) => {
    items.forEach((item) => {
      // Only include static KB articles
      if (item.kind === 'static' && item.type === 'kb') {
        const existing = articlesByUrl.get(item.url);
        if (existing) {
          // Merge bundleTags from duplicate entry
          const combinedTags = new Set([
            ...(existing.bundleTags || []),
            ...(item.bundleTags || []),
          ]);
          existing.bundleTags = Array.from(combinedTags);
        } else {
          // Create new entry with stable ID based on URL
          const urlHash = item.url.split('/').pop() || item.url;
          articlesByUrl.set(item.url, {
            id: `kb-${urlHash}`,
            title: item.title,
            url: item.url,
            bundleTags: item.bundleTags ? [...item.bundleTags] : undefined,
          });
        }
      }
    });
  });

  return Array.from(articlesByUrl.values());
};

const KBPanel = ({
  setNewActionTitle,
  mockArticles,
}: {
  setNewActionTitle: (title: string) => void;
  mockArticles?: KnowledgebaseArticle[];
}) => {
  const intl = useIntl();
  const chrome = useChrome();

  const [searchText, setSearchText] = useState('');
  const [activeToggle, setActiveToggle] = useState<string>('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const {
    bundleId = '',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  } = chrome?.getBundleData?.() || {};
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const availableBundles = chrome?.getAvailableBundles?.() || [];

  const displayBundleName =
    availableBundles.find(
      (b: { id: string; title: string }) => b.id === bundleId
    )?.title || bundleId;

  // Check if we're on the home page
  const isHomePage =
    !displayBundleName ||
    displayBundleName.toLowerCase() === 'home' ||
    displayBundleName.toLowerCase() === 'landing';

  // Get all KB articles from the recommended content config or use mock articles
  const allArticles = useMemo(
    () => mockArticles || getAllKBArticles(),
    [mockArticles]
  );

  // Filter articles based on search and bundle scope
  const filteredArticles = useMemo(() => {
    let filtered = allArticles;

    // Filter by bundle if not showing all (and not on home page)
    if (activeToggle === 'bundle' && !isHomePage && bundleId) {
      filtered = filtered.filter((article) =>
        article.bundleTags?.includes(bundleId)
      );
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((article) =>
        article.title.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [allArticles, searchText, activeToggle, isHomePage, bundleId]);

  // Paginated articles
  const paginatedArticles = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredArticles.slice(startIndex, endIndex);
  }, [filteredArticles, page, perPage]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchText, activeToggle, bundleId]);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setNewActionTitle(value);
  };

  const handleClear = () => {
    setSearchText('');
    setNewActionTitle('');
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
      data-ouia-component-id="help-panel-kb-root"
    >
      {/* Search Input */}
      <StackItem>
        <SearchInput
          placeholder={intl.formatMessage(messages.kbPanelSearchPlaceholder)}
          value={searchText}
          onChange={(_event, value) => handleSearchChange(value)}
          onClear={handleClear}
          data-ouia-component-id="help-panel-kb-search-input"
        />
      </StackItem>

      <StackItem>
        <Content>
          {intl.formatMessage(messages.kbPanelDescription)}{' '}
          <Button
            variant="link"
            component="a"
            href="https://access.redhat.com/support"
            target="_blank"
            rel="noopener noreferrer"
            isInline
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
          >
            {intl.formatMessage(messages.customerPortalLinkText)}
          </Button>
        </Content>
      </StackItem>

      {/* Toolbar with results count and toggle group */}
      <StackItem>
        <Toolbar
          id="kb-articles-toolbar"
          data-ouia-component-id="help-panel-kb-toolbar"
        >
          <ToolbarContent>
            <ToolbarItem>
              <Content>
                {intl.formatMessage(messages.kbArticlesCountLabel)} (
                {filteredArticles.length})
              </Content>
            </ToolbarItem>
            <ToolbarItem>
              {!isHomePage && (
                <ToggleGroup
                  isCompact
                  aria-label={intl.formatMessage(
                    messages.filterByScopeAriaLabel
                  )}
                  data-ouia-component-id="help-panel-kb-scope-toggle"
                >
                  <ToggleGroupItem
                    text={intl.formatMessage(messages.allToggleText)}
                    buttonId="kb-all-toggle"
                    isSelected={activeToggle === 'all'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'all')
                    }
                    data-ouia-component-id="help-panel-kb-scope-toggle-all"
                  />
                  <ToggleGroupItem
                    text={displayBundleName}
                    buttonId="kb-bundle-toggle"
                    isSelected={activeToggle === 'bundle'}
                    onChange={(event, isSelected) =>
                      handleToggleChange(event, isSelected, 'bundle')
                    }
                    data-ouia-component-id="help-panel-kb-scope-toggle-bundle"
                  />
                </ToggleGroup>
              )}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </StackItem>

      {/* Knowledgebase articles list */}
      <StackItem isFilled className="pf-v6-u-overflow-hidden">
        <div
          className="pf-v6-u-h-100 pf-v6-u-overflow-y-auto"
          data-ouia-component-id="help-panel-kb-articles-list"
        >
          {filteredArticles.length > 0 ? (
            <DataList aria-label="Knowledgebase articles">
              {paginatedArticles.map((article) => (
                <DataListItem key={article.id}>
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="article-content" isFilled>
                          <Stack hasGutter={false}>
                            <StackItem>
                              <Button
                                variant="link"
                                component="a"
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                isInline
                                className="pf-v6-u-text-align-left pf-v6-u-p-0"
                                icon={<ExternalLinkAltIcon />}
                                iconPosition="end"
                              >
                                {article.title}
                              </Button>
                            </StackItem>
                            {article.bundleTags &&
                              article.bundleTags.length > 0 && (
                                <StackItem>
                                  <Flex
                                    spaceItems={{ default: 'spaceItemsXs' }}
                                  >
                                    {article.bundleTags.map((tag, index) => {
                                      // Uppercase RHEL and IAM tags, title case for others
                                      let displayTag;
                                      if (tag === 'rhel' || tag === 'iam') {
                                        displayTag = tag.toUpperCase();
                                      } else {
                                        displayTag =
                                          tag.charAt(0).toUpperCase() +
                                          tag.slice(1);
                                      }
                                      return (
                                        <FlexItem key={index}>
                                          <Label
                                            color="grey"
                                            variant="filled"
                                            isCompact
                                          >
                                            {displayTag}
                                          </Label>
                                        </FlexItem>
                                      );
                                    })}
                                  </Flex>
                                </StackItem>
                              )}
                          </Stack>
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
              ))}
            </DataList>
          ) : (
            <Content
              component="p"
              className="pf-v6-u-text-align-center pf-v6-u-mt-md"
            >
              {intl.formatMessage(messages.noKbArticlesMessage)}
            </Content>
          )}
        </div>
      </StackItem>

      {/* Pagination */}
      {filteredArticles.length > 0 && (
        <StackItem>
          <Pagination
            itemCount={filteredArticles.length}
            perPage={perPage}
            page={page}
            onSetPage={handleSetPage}
            onPerPageSelect={handlePerPageSelect}
            isCompact
            data-ouia-component-id="help-panel-kb-pagination"
          />
        </StackItem>
      )}
    </Stack>
  );
};

export default KBPanel;
