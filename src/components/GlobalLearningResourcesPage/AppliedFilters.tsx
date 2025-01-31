import React from 'react';
import {
  Chip,
  ChipGroup,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { FetchQuickstartsOptions } from '../../utils/fetchQuickstarts';
import {
  CategoryID,
  FiltersCategoryMetadata,
  FiltersMetadata,
} from '../../utils/FiltersCategoryInterface';

const AppliedFilters: React.FC<{
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: React.Dispatch<
    React.SetStateAction<FetchQuickstartsOptions>
  >;
}> = ({ loaderOptions, setLoaderOptions }) => {
  // Handle removing a single filter
  const removeFilter = (categoryId: CategoryID, filterId: string) => {
    const currentCategory = loaderOptions[categoryId];
    if (Array.isArray(currentCategory)) {
      const updatedCategory = currentCategory.filter((id) => id !== filterId);
      setLoaderOptions((prevLoaderOptions) => ({
        ...prevLoaderOptions,
        [categoryId]: updatedCategory,
      }));
    }
  };

  // Render applied filters dynamically
  return (
    <Toolbar className="pf-v5-u-mt-md">
      <ToolbarContent>
        {Object.keys(loaderOptions).map((categoryId) => {
          const categoryKey = categoryId as CategoryID;
          const filters = loaderOptions[categoryKey];
          if (!Array.isArray(filters) || filters.length === 0) return null;

          const categoryName =
            FiltersCategoryMetadata[
              categoryId as keyof typeof FiltersCategoryMetadata
            ];

          return (
            <ToolbarItem key={categoryId}>
              <ChipGroup categoryName={categoryName}>
                {filters.map((filterId: string) => (
                  <Chip
                    key={filterId}
                    onClick={() => removeFilter(categoryKey, filterId)}
                  >
                    {FiltersMetadata[filterId]}
                  </Chip>
                ))}
              </ChipGroup>
            </ToolbarItem>
          );
        })}
      </ToolbarContent>
    </Toolbar>
  );
};

export default AppliedFilters;
