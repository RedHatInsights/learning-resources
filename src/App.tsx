import React, { useEffect, useMemo, useState } from 'react';
import './App.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import {
  LoadingBox,
  QuickStart,
  QuickStartContext,
  QuickStartContextValues,
  filterQuickStarts,
} from '@patternfly/quickstarts';
import { Divider, Stack, StackItem } from '@patternfly/react-core';
import CatalogHeader from './components/CatalogHeader';
import CatalogFilter from './components/CatalogFilter';
import CatalogSection from './components/CatalogSection';

const sortFnc = (q1: QuickStart, q2: QuickStart) =>
  q1.spec.displayName.localeCompare(q2.spec.displayName);

export const App = ({ bundle }: { bundle: string }) => {
  const {
    activeQuickStartID,
    allQuickStartStates,
    allQuickStarts = [],
    filter,
    setFilter,
    loading,
  } = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [contentReady, setContentReady] = useState(false);

  const { documentation, learningPaths, other, quickStarts } = useMemo(() => {
    const filteredQuickStarts = filterQuickStarts(
      allQuickStarts || [],
      filter?.keyword || '',
      filter?.status?.statusFilters,
      allQuickStartStates || {}
    ).sort(sortFnc);
    return filteredQuickStarts.reduce<{
      documentation: QuickStart[];
      quickStarts: QuickStart[];
      other: QuickStart[];
      learningPaths: QuickStart[];
    }>(
      (acc, curr) => {
        if (curr.metadata.externalDocumentation) {
          acc.documentation.push(curr);
        } else if (curr.metadata.otherResource) {
          other.push(curr);
        } else if (curr.metadata.learningPath) {
          learningPaths.push(curr);
        } else {
          acc.quickStarts.push(curr);
        }

        return acc;
      },
      { documentation: [], quickStarts: [], other: [], learningPaths: [] }
    );
  }, [allQuickStarts, filter]);

  const quickStartsCount =
    quickStarts.length +
    documentation.length +
    learningPaths.length +
    other.length;

  const chrome = useChrome();

  const { quickStarts: quickStartsApi } = chrome;
  const targetBundle = bundle || 'settings';

  chrome?.updateDocumentTitle?.('Learning Resources');

  useEffect(() => {
    fetch(`/api/quickstarts/v1/quickstarts?bundle=${targetBundle}`)
      .then<{ data: { content: QuickStart }[] }>((response) => response.json())
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        quickStartsApi.set(
          `${targetBundle}`,
          data.map(({ content }) => content)
        );
        setContentReady(true);
      })
      .catch((err) => {
        console.log(err.message);
      });
  }, []);

  const onSearchInputChange = (searchValue: string) => {
    setFilter('keyword', searchValue);
  };

  if (!contentReady || loading) {
    return <LoadingBox />;
  }

  return (
    <>
      <div className="pf-u-p-lg lr-c-catalog__header">
        <StackItem className="pf-u-mb-md">
          <CatalogHeader />
        </StackItem>
        <StackItem>
          <CatalogFilter
            quickStartsCount={quickStartsCount}
            onSearchInputChange={onSearchInputChange}
          />
        </StackItem>
      </div>
      <Stack className="pf-u-p-lg">
        <CatalogSection
          sectionCount={documentation.length}
          sectionTitle="Documentation"
          sectionDescription="Technical information for using the service"
          sectionQuickStarts={documentation}
          activeQuickStartID={activeQuickStartID}
          allQuickStartStates={allQuickStartStates}
        />
        <Divider className="pf-u-mt-lg pf-u-mb-lg" />
        <CatalogSection
          sectionCount={quickStarts.length}
          sectionTitle="Quick starts"
          sectionDescription="Step-by-step instructions and tasks"
          sectionQuickStarts={quickStarts}
          activeQuickStartID={activeQuickStartID}
          allQuickStartStates={allQuickStartStates}
        />
        <Divider className="pf-u-mt-lg pf-u-mb-lg" />
        <CatalogSection
          sectionCount={learningPaths.length}
          sectionTitle="Learning paths"
          sectionDescription="Collections of learning materials contributing to a common use case"
          sectionQuickStarts={learningPaths}
          activeQuickStartID={activeQuickStartID}
          allQuickStartStates={allQuickStartStates}
        />
        <Divider className="pf-u-mt-lg pf-u-mb-lg" />
        <CatalogSection
          sectionCount={other.length}
          sectionTitle="Other content types"
          sectionDescription="Tutorials, videos, e-books, and more to help you build your skills"
          sectionQuickStarts={other}
          activeQuickStartID={activeQuickStartID}
          allQuickStartStates={allQuickStartStates}
        />
      </Stack>
    </>
  );
};
