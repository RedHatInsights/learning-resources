import React, { useEffect, useMemo } from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  GalleryItem,
  TabContent,
} from '@patternfly/react-core';
import CubesIcon from '@patternfly/react-icons/dist/dynamic/icons/cubes-icon';
import './GlobalLearningResourcesContent.scss';
import { Gallery } from '@patternfly/react-core';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import GlobalLearningResourcesQuickstartItem from './GlobalLearningResourcesQuickstartItem';
import { useSearchParams } from 'react-router-dom';
import { UnwrappedLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import { TabsEnum } from '../../utils/TabsEnum';
import fetchAllData from '../../utils/fetchAllData';
import {
  ExtendedQuickstart,
  FetchQuickstartsOptions,
} from '../../utils/fetchQuickstarts';
import { Filter, FilterMap, ValidTags } from '../../utils/filtersInterface';
import { TagsEnum } from '../../utils/tagsEnum';
import { SortByDirection } from '@patternfly/react-table';

interface GlobalLearningResourcesContentProps {
  loader: UnwrappedLoader<typeof fetchAllData>;
  loaderOptions: FetchQuickstartsOptions;
  purgeCache: () => void;
  sortOrder: SortByDirection;
}

interface GalleryQuickstartProps {
  quickStarts: ExtendedQuickstart[];
  purgeCache: () => void;
  filterMap: FilterMap;
  sortOrder: SortByDirection;
}

function isValidTagType(
  key: string,
  storage: ValidTags
): key is keyof ValidTags {
  return Object.prototype.hasOwnProperty.call(storage, key);
}

const findQuickstartFilterTags = (
  filterMap: FilterMap,
  QuickStart: ExtendedQuickstart
) => {
  const modifiedTags = QuickStart.metadata.tags.reduce<{
    [TagsEnum.ProductFamilies]: Filter[];
    [TagsEnum.UseCase]: Filter[];
  }>(
    (acc, curr) => {
      const key = curr.kind;
      if (isValidTagType(key, acc)) {
        const newEntry = filterMap[curr.kind][curr.value];
        if (newEntry) {
          acc[key].push(newEntry);
        }
      }
      return acc;
    },
    {
      [TagsEnum.ProductFamilies]: [],
      [TagsEnum.UseCase]: [],
    }
  );

  return modifiedTags;
};

const GalleryQuickstart: React.FC<GalleryQuickstartProps> = ({
  quickStarts,
  purgeCache,
  filterMap,
  sortOrder,
}) => {
  const sortedQuickStarts = useMemo(() => {
    if (!sortOrder) return quickStarts;
    return [...quickStarts].sort((a, b) => {
      const nameA = a.spec.displayName.toLowerCase();
      const nameB = b.spec.displayName.toLowerCase();
      return sortOrder === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  }, [quickStarts, sortOrder]);

  return (
    <Gallery
      hasGutter
      className="lr-c-global-learning-resources-page__content--gallery"
    >
      {sortedQuickStarts.map((quickStart) => {
        const quickStartTags = findQuickstartFilterTags(filterMap, quickStart);
        return (
          <GalleryItem
            key={quickStart.metadata.name}
            className="lr-c-global-learning-resources-page__content--gallery-card-wrapper"
          >
            <GlobalLearningResourcesQuickstartItem
              quickStart={quickStart}
              purgeCache={purgeCache}
              quickStartTags={quickStartTags}
              key={quickStart.metadata.name}
            />
          </GalleryItem>
        );
      })}
    </Gallery>
  );
};

const GalleryBookmarkedQuickstart: React.FC<GalleryQuickstartProps> = ({
  quickStarts,
  purgeCache,
  filterMap,
  sortOrder,
}) => {
  const [, setSearchParams] = useSearchParams();
  const sortedBookmarkedQuickStarts = useMemo(() => {
    const bookmarked = quickStarts.filter((item) => item.metadata.favorite);
    if (!sortOrder) return bookmarked; // No sorting by default

    return [...bookmarked].sort((a, b) => {
      const nameA = a.spec.displayName.toLowerCase();
      const nameB = b.spec.displayName.toLowerCase();
      return sortOrder === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  }, [quickStarts, sortOrder]);

  const bookmarkedItemsCount = sortedBookmarkedQuickStarts.reduce(
    (acc, quickStart) => (quickStart.metadata.favorite ? acc + 1 : acc),
    0
  );
  if (bookmarkedItemsCount === 0) {
    return (
      <Bullseye>
        <EmptyState className="lr-c-global-learning-resources-page__content--empty">
          <EmptyStateHeader
            titleText="No resources bookmarked"
            headingLevel="h4"
            icon={<EmptyStateIcon icon={CubesIcon} />}
          />
          <EmptyStateBody>
            You don&apos;t have any bookmarked learning resources. Click the
            icon in cards on the &apos;All learning resources&apos; tab to
            bookmark a resource.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="link"
                onClick={() => setSearchParams({ tab: TabsEnum.All })}
              >
                Go to the &apos;All learning resources&apos; tab
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <Gallery
      hasGutter
      className="lr-c-global-learning-resources-page__content--gallery"
    >
      {sortedBookmarkedQuickStarts.map((quickStart) => {
        if (quickStart.metadata.favorite) {
          const quickStartTags = findQuickstartFilterTags(
            filterMap,
            quickStart
          );
          return (
            <div
              key={quickStart.metadata.name}
              className="lr-c-global-learning-resources-page__content--gallery-card-wrapper"
            >
              <GlobalLearningResourcesQuickstartItem
                quickStart={quickStart}
                purgeCache={purgeCache}
                quickStartTags={quickStartTags}
                key={quickStart.metadata.name}
              />
            </div>
          );
        }
      })}
    </Gallery>
  );
};

const GlobalLearningResourcesContent: React.FC<
  GlobalLearningResourcesContentProps
> = ({ loader, loaderOptions, purgeCache, sortOrder }) => {
  const chrome = useChrome();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setSearchParams({ tab: TabsEnum.All });
  }, []);

  const [filters, quickStarts] = loader(chrome.auth.getUser, loaderOptions);

  const filterMap = useMemo(() => {
    const filterMap: FilterMap = {};

    filters.data.categories.forEach((category) => {
      const categoryId = category.categoryId;

      // Initialize the category object if it doesn't exist
      if (!filterMap[categoryId]) {
        filterMap[categoryId] = {};
      }

      category.categoryData.forEach((dataGroup) => {
        dataGroup.data.forEach((filter) => {
          filterMap[categoryId][filter.id] = {
            id: filter.id,
            cardLabel: filter.cardLabel,
            filterLabel: filter.filterLabel,
            ...(filter.icon && { icon: filter.icon }), // Only include the icon if it exists
          };
        });
      });
    });
    return filterMap;
  }, [filters]);

  return (
    <div className="pf-v5-u-p-md">
      <TabContent
        id="refTabResources"
        hidden={searchParams.get('tab') !== TabsEnum.All}
      >
        <GalleryQuickstart
          quickStarts={quickStarts}
          filterMap={filterMap}
          purgeCache={purgeCache}
          sortOrder={sortOrder}
        />
      </TabContent>
      <TabContent
        id="refTabBookmarks"
        hidden={searchParams.get('tab') !== TabsEnum.Bookmarks}
      >
        <GalleryBookmarkedQuickstart
          quickStarts={quickStarts}
          purgeCache={purgeCache}
          filterMap={filterMap}
          sortOrder={sortOrder}
        />
      </TabContent>
    </div>
  );
};

export default GlobalLearningResourcesContent;
