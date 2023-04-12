import React, { useEffect } from 'react';
import './App.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  LoadingBox,
  QuickStart,
  QuickStartCatalog,
  QuickStartCatalogEmptyState,
  QuickStartCatalogFilterCountWrapper,
  QuickStartCatalogFilterStatusWrapper,
  QuickStartCatalogHeader,
  QuickStartCatalogSection,
  QuickStartCatalogToolbar,
  QuickStartContext,
  QuickStartContextValues,
  QuickStartTile,
  clearFilterParams,
  filterQuickStarts,
  getQuickStartStatus,
} from '@patternfly/quickstarts';
import {
  Divider,
  Gallery,
  GalleryItem,
  SearchInput,
  Text,
  TextContent,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';

export const App: React.FC = () => {
  const {
    activeQuickStartID,
    allQuickStartStates,
    allQuickStarts,
    filter,
    setFilter,
    loading,
  } = React.useContext<QuickStartContextValues>(QuickStartContext);

  const chrome = useChrome();

  const { quickStarts } = chrome;

  useEffect(() => {
    fetch(`/api/quickstarts/v1/quickstarts?bundle=settings`)
      .then<{ data: { content: QuickStart }[] }>((response) => response.json())
      .then(({ data }) =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        quickStarts.set(
          'settings',
          data.map(({ content }) => content)
        )
      )
      .catch((err) => {
        console.log(err.message);
      });
  }, []);

  const sortFnc = (q1: QuickStart, q2: QuickStart) =>
    q1.spec.displayName.localeCompare(q2.spec.displayName);

  const [filteredQuickStarts, setFilteredQuickStarts] = React.useState<
    QuickStart[]
  >(
    filterQuickStarts(
      allQuickStarts || [],
      filter?.keyword || '',
      filter?.status?.statusFilters,
      allQuickStartStates || {}
    ).sort(sortFnc)
  );

  React.useEffect(() => {
    // callback on state change
    setFilteredQuickStarts(
      filterQuickStarts(
        allQuickStarts || [],
        filter?.keyword || '',
        filter?.status?.statusFilters,
        allQuickStartStates || {}
      ).sort(sortFnc)
    );
  }, [
    allQuickStartStates,
    allQuickStarts,
    filter?.keyword,
    filter?.status?.statusFilters,
  ]);

  const onSearchInputChange = (searchValue: string) => {
    const result = filterQuickStarts(
      allQuickStarts || [],
      searchValue,
      filter?.status?.statusFilters,
      allQuickStartStates || {}
    ).sort((q1: QuickStart, q2: QuickStart) =>
      q1.spec.displayName.localeCompare(q2.spec.displayName)
    );
    setFilter('keyword', searchValue);
    setFilteredQuickStarts(result);
  };

  const onStatusChange = (statusList: string[]) => {
    const result = filterQuickStarts(
      allQuickStarts || [],
      filter?.keyword || '',
      statusList,
      allQuickStartStates || {}
    ).sort((q1: QuickStart, q2: QuickStart) =>
      q1.spec.displayName.localeCompare(q2.spec.displayName)
    );
    setFilter('status', statusList);
    setFilteredQuickStarts(result);
  };

  const CatalogWithSections = (
    <>
      <QuickStartCatalogSection>
        <TextContent className="pf-u-mb-sm">
          <Text component="h2">Quick starts</Text>
          <Text component="p" className="catalog-sub">
            Quick starts for using the Red Hat Hybrid Cloud Console
          </Text>
        </TextContent>
        <Gallery className="pfext-quick-start-catalog__gallery" hasGutter>
          {allQuickStarts
            ?.filter(
              (quickStart: QuickStart) =>
                !quickStart.metadata.externalDocumentation
            )
            .map((quickStart: QuickStart) => {
              const {
                metadata: { name: id },
              } = quickStart;

              return (
                <GalleryItem
                  key={id}
                  className="pfext-quick-start-catalog__gallery-item"
                >
                  <QuickStartTile
                    quickStart={quickStart}
                    isActive={id === activeQuickStartID}
                    status={getQuickStartStatus(allQuickStartStates || {}, id)}
                  />
                </GalleryItem>
              );
            })}
        </Gallery>
      </QuickStartCatalogSection>
      <Divider />
      <QuickStartCatalogSection>
        <TextContent className="pf-u-mb-sm">
          <Text component="h2">Documentation</Text>
          <Text component="p" className="catalog-sub">
            Technical information for using the Red Hat Hybrid Cloud Console
          </Text>
        </TextContent>
        <Gallery className="pfext-quick-start-catalog__gallery" hasGutter>
          {allQuickStarts
            ?.filter(
              (quickStart: QuickStart) =>
                quickStart.metadata.externalDocumentation
            )
            .map((quickStart: QuickStart) => {
              const {
                metadata: { name: id },
              } = quickStart;

              return (
                <GalleryItem
                  key={id}
                  className="pfext-quick-start-catalog__gallery-item"
                >
                  <QuickStartTile
                    quickStart={quickStart}
                    isActive={id === activeQuickStartID}
                    status={getQuickStartStatus(allQuickStartStates || {}, id)}
                  />
                </GalleryItem>
              );
            })}
        </Gallery>
      </QuickStartCatalogSection>
    </>
  );

  const clearFilters = () => {
    setFilter('keyword', '');
    setFilter('status', []);
    clearFilterParams();
    setFilteredQuickStarts(
      allQuickStarts?.sort((q1: QuickStart, q2: QuickStart) =>
        q1.spec.displayName.localeCompare(q2.spec.displayName)
      ) || []
    );
  };

  if (loading) {
    return <LoadingBox />;
  }

  return (
    <>
      <QuickStartCatalogHeader title="Learning Resources" />
      <Divider component="div" />
      <QuickStartCatalogToolbar>
        <ToolbarContent>
          <ToolbarItem className="pfext-quick-start-catalog-filter__input">
            <SearchInput
              placeholder={'Filter by keyword...'}
              onChange={(_ev, str) => onSearchInputChange(str)}
            />
          </ToolbarItem>
          <QuickStartCatalogFilterStatusWrapper
            onStatusChange={onStatusChange}
          />
          <QuickStartCatalogFilterCountWrapper
            quickStartsCount={filteredQuickStarts.length}
          />
        </ToolbarContent>
      </QuickStartCatalogToolbar>
      <Divider component="div" />
      {filteredQuickStarts.length === 0 ? (
        <QuickStartCatalogEmptyState clearFilters={clearFilters} />
      ) : filteredQuickStarts.length !== allQuickStarts?.length ? (
        <QuickStartCatalog quickStarts={filteredQuickStarts} />
      ) : (
        CatalogWithSections
      )}
    </>
  );
};
