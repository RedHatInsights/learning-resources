import React, { useEffect, useState } from 'react';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  Divider,
  EmptyState,
  PageGroup,
  PageSection,
  Pagination,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  StackItem,
} from '@patternfly/react-core';
import CatalogHeader from './components/CatalogHeader';
import CatalogFilter from './components/CatalogFilter';
import CatalogSection from './components/CatalogSection';
import TableOfContents from './components/TableOfContents';
import { useFlag } from '@unleash/proxy-client-react';
import useQuickStarts from './hooks/useQuickStarts';
import {
  BookmarkedIcon,
  OutlinedBookmarkedIcon,
} from './components/common/BookmarkIcon';
import useFilterMap from './hooks/useFilterMap';
import { UnwrappedLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader/useSuspenseLoader';
import fetchAllData from './utils/fetchAllData';

export const Viewer = ({
  bundle,
  loader,
  purgeCache,
}: {
  bundle: string;
  loader: UnwrappedLoader<typeof fetchAllData>;
  purgeCache: () => void;
}) => {
  const chrome = useChrome();
  const [localFilter, setFilter] = useState('');
  const showBookmarks = useFlag('platform.learning-resources.bookmarks');

  const [size, setSize] = useState(window.innerHeight);
  const targetBundle = bundle || 'settings';
  const [filters, allQuickStarts] = loader(chrome.auth.getUser, {
    bundle: targetBundle,
  });

  const filterMap = useFilterMap(filters);

  const { documentation, learningPaths, other, bookmarks, quickStarts } =
    useQuickStarts(allQuickStarts, localFilter);
  const [pagination, setPagination] = useState({
    count: bookmarks.length,
    perPage: 20,
    page: 1,
  });

  const quickStartsCount =
    quickStarts.length +
    documentation.length +
    learningPaths.length +
    other.length;

  chrome.updateDocumentTitle('Learning Resources');
  useEffect(() => {
    chrome.hideGlobalFilter(true);
  }, []);

  const onSearchInputChange = (searchValue: string) => {
    setFilter(searchValue);
  };

  React.useLayoutEffect(() => {
    function updateSize() {
      setSize(
        window.innerHeight -
          (document.querySelector('header')?.getBoundingClientRect()?.height ||
            0)
      );
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <PageGroup id="learning-resources-wrapper" style={{ height: `${size}px` }}>
      <PageSection
        hasBodyWrapper={false}
        className="pf-v6-u-p-lg lr-c-catalog__header"
      >
        <StackItem className="pf-v6-u-mb-md">
          <CatalogHeader />
        </StackItem>
        <StackItem>
          <CatalogFilter
            quickStartsCount={quickStartsCount}
            onSearchInputChange={onSearchInputChange}
          />
        </StackItem>
      </PageSection>
      <PageSection
        hasBodyWrapper={false}
        className="pf-v6-u-background-color-200 pf-m-fill"
      >
        <div className="pf-v6-u-h-100">
          <Sidebar id="content-wrapper" isPanelRight hasGutter>
            <SidebarContent
              id="quick-starts"
              className="pf-v6-u-background-color-200"
            >
              {showBookmarks && (
                <React.Fragment>
                  <CatalogSection
                    purgeCache={purgeCache}
                    sectionName="bookmarks"
                    filterMap={filterMap}
                    sectionCount={bookmarks.length}
                    emptyBody={
                      <EmptyState className="lr-c-empty_bookmarks">
                        No bookmarked resources yet. Click the{' '}
                        <OutlinedBookmarkedIcon className="pf-v6-u-mr-sm" />
                        icon to pin it to your bookmarks here.
                      </EmptyState>
                    }
                    sectionTitle={
                      <span>
                        <BookmarkedIcon className="pf-v6-u-mr-sm" />
                        Bookmarks
                      </span>
                    }
                    rightTitle={
                      <Pagination
                        itemCount={bookmarks.length}
                        perPage={pagination.perPage}
                        page={pagination.page}
                        onSetPage={(_e, newPage) => {
                          setPagination((pagination) => ({
                            ...pagination,
                            page: newPage,
                          }));
                        }}
                        widgetId="pagination-options-menu-top"
                        onPerPageSelect={(_e, perPage) =>
                          setPagination((pagination) => ({
                            ...pagination,
                            perPage,
                          }))
                        }
                        isCompact
                      />
                    }
                    isExpandable={false}
                    sectionQuickStarts={bookmarks.slice(
                      (pagination.page - 1) * pagination.perPage,
                      pagination.page * (pagination.perPage - 1) + 1
                    )}
                  />
                  <Divider className="pf-v6-u-mt-lg pf-v6-u-mb-lg" />
                </React.Fragment>
              )}
              <CatalogSection
                purgeCache={purgeCache}
                filterMap={filterMap}
                sectionName="documentation"
                sectionCount={documentation.length}
                sectionTitle="Documentation"
                sectionDescription="Technical information for using the service"
                sectionQuickStarts={documentation}
              />
              <Divider className="pf-v6-u-mt-lg pf-v6-u-mb-lg" />
              <CatalogSection
                sectionName="quick-starts"
                purgeCache={purgeCache}
                filterMap={filterMap}
                sectionCount={quickStarts.length}
                sectionTitle="Quick starts"
                sectionDescription="Step-by-step instructions and tasks"
                sectionQuickStarts={quickStarts}
              />
              <Divider className="pf-v6-u-mt-lg pf-v6-u-mb-lg" />
              <CatalogSection
                sectionName="learning-paths"
                purgeCache={purgeCache}
                filterMap={filterMap}
                sectionCount={learningPaths.length}
                sectionTitle="Learning paths"
                sectionDescription="Collections of learning materials contributing to a common use case"
                sectionQuickStarts={learningPaths}
              />
              <Divider className="pf-v6-u-mt-lg pf-v6-u-mb-lg" />
              <CatalogSection
                sectionName="other-content-types"
                purgeCache={purgeCache}
                filterMap={filterMap}
                sectionCount={other.length}
                sectionTitle="Other content types"
                sectionDescription="Tutorials, videos, e-books, and more to help you build your skills"
                sectionQuickStarts={other}
              />
            </SidebarContent>
            <SidebarPanel
              variant="sticky"
              className="pf-v6-u-background-color-200 pf-v6-u-pl-lg pf-v6-u-pl-0-on-lg"
            >
              <TableOfContents
                defaultActive="bookmarks"
                linkItems={[
                  {
                    id: 'bookmarks',
                    label: `Bookmarks (${bookmarks.length})`,
                  },
                  {
                    id: 'documentation',
                    label: `Documentation (${documentation.length})`,
                  },
                  {
                    id: 'quick-starts',
                    label: `Quick starts (${quickStarts.length})`,
                  },
                  {
                    id: 'learning-paths',
                    label: `Learning paths (${learningPaths.length})`,
                  },
                  {
                    id: 'other-content-types',
                    label: `Other content types (${other.length})`,
                  },
                ]}
              />
            </SidebarPanel>
          </Sidebar>
        </div>
      </PageSection>
    </PageGroup>
  );
};
