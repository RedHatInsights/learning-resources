import { useMemo } from 'react';
import { FilterMap } from '../utils/filtersInterface';
import { FilterData } from '../utils/FiltersCategoryInterface';

const useFilterMap = (filters: { data: FilterData }) => {
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
  return filterMap;
};

export type UseFilerMapValue = ReturnType<typeof useFilterMap>;

export default useFilterMap;
