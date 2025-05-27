import { useMemo } from 'react';
import { UnwrappedLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import fetchAllData from '../utils/fetchAllData';
import { ExtendedQuickstart } from '../utils/fetchQuickstarts';

export const API_BASE = '/api/quickstarts/v1';
export const QUICKSTARTS = '/quickstarts';
export const FAVORITES = '/favorites';
export const FILTERS = '/filters';

export type FavoriteQuickStart = {
  favorite: boolean;
  quickstartName: string;
};

function filterFunction(filter: string, quickstart: ExtendedQuickstart) {
  const parsedFilter = filter.toLowerCase();
  const displayName = quickstart.spec.displayName.toLowerCase();
  const description = quickstart.spec.description
    ? quickstart.spec.description.toLowerCase()
    : '';
  const parsedTags = quickstart.metadata.tags
    .map((tag) => ({
      ...tag,
      value: tag.value.toLowerCase(),
    }))
    .join(' ');
  return (
    displayName.includes(parsedFilter) ||
    description.includes(parsedFilter) ||
    parsedTags.includes(parsedFilter)
  );
}

const sortFnc = (q1: ExtendedQuickstart, q2: ExtendedQuickstart) =>
  q1.spec.displayName.localeCompare(q2.spec.displayName);

const useQuickStarts = (
  quickstarts: ReturnType<UnwrappedLoader<typeof fetchAllData>>[1],
  filter = ''
) => {
  const favorites = useMemo<FavoriteQuickStart[]>(() => {
    const favorites = quickstarts.reduce<FavoriteQuickStart[]>((acc, curr) => {
      if (curr.metadata.favorite) {
        acc.push({
          favorite: curr.metadata.favorite,
          quickstartName: curr.metadata.name,
        });
      }
      return acc;
    }, []);
    return favorites;
  }, [quickstarts]);

  const state = useMemo(() => {
    return quickstarts.sort(sortFnc).reduce<{
      bookmarks: ExtendedQuickstart[];
      documentation: ExtendedQuickstart[];
      quickStarts: ExtendedQuickstart[];
      other: ExtendedQuickstart[];
      learningPaths: ExtendedQuickstart[];
    }>(
      (acc, curr) => {
        if (filter && !filterFunction(filter, curr)) {
          return acc;
        }

        if (curr.metadata.favorite) {
          acc.bookmarks.push(curr);
        }
        if (curr.metadata.externalDocumentation) {
          acc.documentation.push(curr);
        } else if (curr.metadata.otherResource) {
          acc.other.push(curr);
        } else if (curr.metadata.learningPath) {
          acc.learningPaths.push(curr);
        } else {
          acc.quickStarts.push(curr);
        }

        return acc;
      },
      {
        documentation: [],
        quickStarts: [],
        other: [],
        learningPaths: [],
        bookmarks: [],
      }
    );
  }, [quickstarts, filter, favorites]);

  return state;
};

export default useQuickStarts;
