import React, { useState } from 'react';
import {
  Checkbox,
  Content,
  ContentVariants,
  ExpandableSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FiltersCategory } from '../../utils/FiltersCategoryInterface';
import { Filter, updateCategory } from '../../utils/filtersInterface';
import './GlobalLearningResourcesFilters.scss';

const GlobalLearningResourcesFiltersCategory: React.FC<FiltersCategory> = ({
  categoryId,
  categoryName,
  categoryData,
  loaderOptions,
  setLoaderOptions,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const onToggle = (_event: React.MouseEvent, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  const updateLoaderOptions = (filter: Filter, isChecked: boolean) => {
    const currentCategory = loaderOptions[categoryId];

    const updatedCategory = updateCategory(
      isChecked,
      filter.id,
      currentCategory,
      categoryId
    );

    setLoaderOptions({
      ...loaderOptions,
      ...updatedCategory,
    });
  };

  const isFilterChecked = (filterId: string) => {
    return (loaderOptions[categoryId] || []).includes(filterId);
  };

  return (
    <ExpandableSection
      toggleText={categoryName}
      onToggle={onToggle}
      isExpanded={isExpanded}
      className="lr-c-global-learning-resources-page__filters--expandable"
    >
      {categoryData.map((subCategory, index) => (
        <Stack
          component="div"
          className="pf-v6-u-mb-md pf-v6-u-mt-0"
          key={index}
        >
          <Content>
            {subCategory.group ? (
              <Content
                component={ContentVariants.small}
                className="pf-v6-u-mb-sm"
              >
                {subCategory.group}
              </Content>
            ) : null}
            {subCategory.data.map((item) => (
              <StackItem
                key={`${categoryId}-${item.id}`}
                className="pf-v6-u-display-flex pf-v6-u-align-items-center"
              >
                <Checkbox
                  label={
                    <div className="lr-c-global-learning-resources-page__filters--checkbox pf-v6-u-display-flex pf-v6-u-align-items-flex-start ">
                      {item.icon ? (
                        <img
                          className="lr-c-global-learning-resources-page__filters--checkbox-icon pf-v6-u-mr-sm"
                          src={item.icon}
                          alt={item.filterLabel}
                        />
                      ) : null}
                      <span className="lr-c-global-learning-resources-page__filters--checkbox-text">
                        {item.filterLabel}
                      </span>
                    </div>
                  }
                  id={item.id}
                  isChecked={isFilterChecked(item.id)}
                  onChange={(event: React.FormEvent<HTMLInputElement>) =>
                    updateLoaderOptions(item, event.currentTarget.checked)
                  }
                />
              </StackItem>
            ))}
          </Content>
        </Stack>
      ))}
    </ExpandableSection>
  );
};

export default GlobalLearningResourcesFiltersCategory;
