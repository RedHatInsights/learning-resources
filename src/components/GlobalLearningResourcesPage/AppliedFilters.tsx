import React from 'react';
import {
  Label,
  LabelGroup,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';

import { FetchQuickstartsOptions } from '../../utils/fetchQuickstarts';
import {
  CategoryID,
  FilterCategoryID,
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

  // Render applied filters dynamically (exclude 'fuzzy' — it is boolean, not an array of filter chips)
  return (
    <Toolbar className="pf-v6-u-mt-md">
      <ToolbarContent>
        {(Object.keys(loaderOptions) as CategoryID[])
          .filter((key): key is FilterCategoryID => key !== 'fuzzy')
          .map((categoryId) => {
            const filters = loaderOptions[categoryId];
            if (!Array.isArray(filters) || filters.length === 0) return null;

            const categoryName = FiltersCategoryMetadata[categoryId];

            return (
              <ToolbarItem key={categoryId}>
                <LabelGroup categoryName={categoryName}>
                  {filters.map((filterId: string) => (
                    <Label
                      variant="outline"
                      key={filterId}
                      onClose={() => removeFilter(categoryId, filterId)}
                    >
                      {FiltersMetadata[filterId]}
                    </Label>
                  ))}
                </LabelGroup>
              </ToolbarItem>
            );
          })}
      </ToolbarContent>
    </Toolbar>
  );
};

export default AppliedFilters;
