import React, { useEffect, useState } from 'react';
import './Viewer.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  LoadingBox,
  QuickStartContext,
  QuickStartContextValues,
} from '@patternfly/quickstarts';
import {
  Divider,
  EmptyState,
  Icon,
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
import { BookmarkIcon, OutlinedBookmarkIcon } from '@patternfly/react-icons';
import { useFlag } from '@unleash/proxy-client-react';
import useQuickStarts from './hooks/useQuickStarts';

export const Viewer = ({ bundle }: { bundle: string }) => {
  const chrome = useChrome();
  const { activeQuickStartID, allQuickStartStates, setFilter, loading } =
    React.useContext<QuickStartContextValues>(QuickStartContext);
  const showBookmarks = useFlag('platform.learning-resources.bookmarks');

  const [size, setSize] = useState(window.innerHeight);
  const targetBundle = bundle || 'settings';

  const {
    contentReady,
    documentation,
    learningPaths,
    other,
    quickStarts,
    bookmarks,
    toggleFavorite,
  } = useQuickStarts(targetBundle);
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
    setFilter('keyword', searchValue);
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

  if (!contentReady || loading) {
    return <LoadingBox />;
  }

  return (
    <PageGroup id="learning-resources-wrapper" style={{ height: `${size}px` }}>
      <PageSection className="pf-u-p-lg lr-c-catalog__header">
        <StackItem className="pf-u-mb-md">
          <CatalogHeader />
        </StackItem>
        <StackItem>
          <CatalogFilter
            quickStartsCount={quickStartsCount}
            onSearchInputChange={onSearchInputChange}
          />
        </StackItem>
      </PageSection>
      <PageSection className="pf-u-background-color-200 pf-m-fill">
        <div className="pf-v5-u-h-100">
          <Sidebar id="content-wrapper" isPanelRight hasGutter>
            <SidebarContent
              id="quick-starts"
              className="pf-u-background-color-200"
            >
              {showBookmarks && (
                <React.Fragment>
                  <CatalogSection
                    sectionName="bookmarks"
                    toggleFavorite={toggleFavorite}
                    sectionCount={bookmarks.length}
                    emptyBody={
                      <EmptyState className="lr-c-empty_bookmarks">
                        No bookmarked resources yet. Click the{' '}
                        <Icon className="lr-c-bookmark__icon">
                          <OutlinedBookmarkIcon />
                        </Icon>
                        icon to pin it to your bookmarks here.
                      </EmptyState>
                    }
                    sectionTitle={
                      <span>
                        <Icon className="lr-c-bookmark__icon pf-v5-u-ml-sm pf-v5-u-pr-md">
                          <BookmarkIcon />
                        </Icon>
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
                    activeQuickStartID={activeQuickStartID}
                    allQuickStartStates={allQuickStartStates}
                  />
                  <Divider className="pf-u-mt-lg pf-u-mb-lg" />
                </React.Fragment>
              )}
              <CatalogSection
                sectionName="documentation"
                toggleFavorite={toggleFavorite}
                sectionCount={documentation.length}
                sectionTitle="Documentation"
                sectionDescription="Technical information for using the service"
                sectionQuickStarts={documentation}
                activeQuickStartID={activeQuickStartID}
                allQuickStartStates={allQuickStartStates}
              />
              <Divider className="pf-u-mt-lg pf-u-mb-lg" />
              <CatalogSection
                sectionName="quick-starts"
                toggleFavorite={toggleFavorite}
                sectionCount={quickStarts.length}
                sectionTitle="Quick starts"
                sectionDescription="Step-by-step instructions and tasks"
                sectionQuickStarts={quickStarts}
                activeQuickStartID={activeQuickStartID}
                allQuickStartStates={allQuickStartStates}
              />
              <Divider className="pf-u-mt-lg pf-u-mb-lg" />
              <CatalogSection
                sectionName="learning-paths"
                toggleFavorite={toggleFavorite}
                sectionCount={learningPaths.length}
                sectionTitle="Learning paths"
                sectionDescription="Collections of learning materials contributing to a common use case"
                sectionQuickStarts={learningPaths}
                activeQuickStartID={activeQuickStartID}
                allQuickStartStates={allQuickStartStates}
              />
              <Divider className="pf-u-mt-lg pf-u-mb-lg" />
              <CatalogSection
                sectionName="other-content-types"
                toggleFavorite={toggleFavorite}
                sectionCount={other.length}
                sectionTitle="Other content types"
                sectionDescription="Tutorials, videos, e-books, and more to help you build your skills"
                sectionQuickStarts={other}
                activeQuickStartID={activeQuickStartID}
                allQuickStartStates={allQuickStartStates}
              />
            </SidebarContent>
            <SidebarPanel
              variant="sticky"
              className="pf-u-background-color-200 pf-u-pl-lg pf-u-pl-0-on-lg"
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
