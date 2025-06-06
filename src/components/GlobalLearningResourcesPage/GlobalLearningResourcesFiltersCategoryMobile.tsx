import React from 'react';
import {
  Checkbox,
  Content,
  ContentVariants,
  Divider,
  DrilldownMenu,
  MenuItem,
} from '@patternfly/react-core';
import { FiltersCategory } from '../../utils/FiltersCategoryInterface';
import { Filter, updateCategory } from '../../utils/filtersInterface';
import './GlobalLearningResourcesFiltersCategoryMobile.scss';

const GlobalLearningResourcesFiltersCategoryMobile: React.FC<
  FiltersCategory
> = ({
  categoryId,
  categoryName,
  categoryData,
  loaderOptions,
  setLoaderOptions,
}) => {
  const updateLoaderOptions = (filter: Filter, isChecked: boolean) => {
    const currentCategory = loaderOptions[categoryId];

    const updatedCategory = updateCategory(
      isChecked,
      filter.id,
      currentCategory,
      categoryId
    );

    setLoaderOptions((prevLoaderOptions) => ({
      ...prevLoaderOptions,
      ...updatedCategory,
    }));
  };

  const isFilterChecked = (filterId: string) => {
    return (loaderOptions[categoryId] || []).includes(filterId);
  };

  return (
    <MenuItem
      key={categoryId}
      itemId={`category:${categoryId}`}
      direction="down"
      drilldownMenu={
        <DrilldownMenu id={`menu-${categoryId}`}>
          {/* Breadcrumb for returning to the main menu */}
          <MenuItem itemId={`category:${categoryId}_breadcrumb`} direction="up">
            {categoryName}
          </MenuItem>
          <Divider component="li" />
          {/* Render all filters in a flat structure */}
          {categoryData.map((group, index) => (
            <div key={index} className="pf-v6-u-mt-md">
              {/* Render group title if available */}
              {group.group && (
                <Content
                  component={ContentVariants.small}
                  className="pf-v6-u-ml-md pf-v6-u-font-weight-bold"
                >
                  {group.group}
                </Content>
              )}
              {/* Render filters */}
              {group.data.map((item) => (
                <MenuItem
                  key={item.id}
                  itemId={`item:${categoryId}-${item.id}`}
                >
                  <Checkbox
                    label={
                      <div className="lr-c-global-learning-resources-page__filters-mobile--wrapper">
                        {item.icon ? (
                          <img
                            className="lr-c-global-learning-resources-page__filters-mobile--icon pf-v6-u-mr-sm"
                            src={item.icon}
                            alt={item.filterLabel}
                          />
                        ) : null}
                        <Content component="p">{item.filterLabel}</Content>
                      </div>
                    }
                    id={item.id}
                    isChecked={isFilterChecked(item.id)}
                    onChange={(event: React.FormEvent<HTMLInputElement>) =>
                      updateLoaderOptions(item, event.currentTarget.checked)
                    }
                  />
                </MenuItem>
              ))}
            </div>
          ))}
        </DrilldownMenu>
      }
    >
      {categoryName}
    </MenuItem>
  );
};

export default GlobalLearningResourcesFiltersCategoryMobile;
