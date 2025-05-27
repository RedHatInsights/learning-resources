import React from 'react';
import { Spinner, Tab, TabTitleText, Tabs } from '@patternfly/react-core';
import './GlobalLearningResourcesTabs.scss';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { QuickStart } from '@patternfly/quickstarts';
import { Link, useSearchParams } from 'react-router-dom';
import { TabsEnum } from '../../utils/TabsEnum';
import { UnwrappedLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import fetchAllData from '../../utils/fetchAllData';
import { FetchQuickstartsOptions } from '../../utils/fetchQuickstarts';

interface GlobalLearningResourcesTabsProps {
  loader?: UnwrappedLoader<typeof fetchAllData>;
  loaderOptions?: FetchQuickstartsOptions;
}

const GlobalLearningResourcesTabs: React.FC<
  GlobalLearningResourcesTabsProps
> = ({ loader, loaderOptions }) => {
  const [searchParams] = useSearchParams();
  const chrome = useChrome();
  type LoaderResponse = [unknown, QuickStart[]];
  const fallback: LoaderResponse = [{}, []];
  const [, quickStarts]: LoaderResponse =
    loader?.(chrome.auth.getUser, loaderOptions) ?? fallback;

  const bookmarkedResourcesCount = quickStarts.reduce(
    (acc, cur) => (cur.metadata.favorite ? acc + 1 : acc),
    0
  );

  return (
    <Tabs
      aria-label="Tab"
      role="region"
      className="lr-c-global-learning-resources-tabs pf-v6-u-pt-md pf-v6-u-pl-xl"
      activeKey={searchParams.get('tab')!}
    >
      <Tab
        eventKey="all"
        title={
          <Link
            to={{
              pathname: '.',
              search: `?tab=${TabsEnum.All}`,
            }}
          >
            <TabTitleText>
              All learning resources (
              {!loader ? <Spinner size="md" /> : quickStarts.length})
            </TabTitleText>
          </Link>
        }
        tabContentId="refTabResources"
      />
      <Tab
        eventKey="bookmarks"
        title={
          <Link
            to={{
              pathname: '.',
              search: `?tab=${TabsEnum.Bookmarks}`,
            }}
          >
            <TabTitleText>
              My bookmarked resources (
              {!loader ? <Spinner size="md" /> : bookmarkedResourcesCount})
            </TabTitleText>
          </Link>
        }
        tabContentId="refTabBookmarks"
      />
    </Tabs>
  );
};

export default GlobalLearningResourcesTabs;
