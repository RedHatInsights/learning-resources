import React, { useState } from 'react';
import {
  Checkbox,
  ExpandableSection,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
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
          className="pf-v5-u-mb-md pf-v5-u-mt-0"
          key={index}
        >
          <TextContent>
            {subCategory.group ? (
              <Text component={TextVariants.small} className="pf-v5-u-mb-sm">
                {subCategory.group}
              </Text>
            ) : null}
            {subCategory.data.map((item) => (
              <StackItem
                key={categoryId}
                className="pf-v5-u-display-flex pf-v5-u-align-items-center"
              >
                <Checkbox
                  label={
                    <div className="lr-c-global-learning-resources-page__filters--checkbox pf-v5-u-display-flex pf-v5-u-align-items-flex-start ">
                      {item.icon ? (
                        <img
                          className="lr-c-global-learning-resources-page__filters--checkbox-icon pf-v5-u-mr-sm"
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
          </TextContent>
        </Stack>
      ))}
    </ExpandableSection>
  );
};

export default GlobalLearningResourcesFiltersCategory;
