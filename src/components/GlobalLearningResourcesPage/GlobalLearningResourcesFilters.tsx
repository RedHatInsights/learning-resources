import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextInputGroup,
  TextInputGroupMain,
  TextVariants,
} from '@patternfly/react-core';
import { FilterIcon, SortAmountDownAltIcon } from '@patternfly/react-icons';
import './GlobalLearningResourcesFilters.scss';
import GlobalLearningResourcesFiltersCategory from './GlobalLearningResourcesFiltersCategory';
import { FiltersCategory } from '../../utils/FiltersCategoryInterface';
import { UnwrappedLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import fetchAllData from '../../utils/fetchAllData';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import {
  FetchQuickstartsOptions,
  loaderOptionsFalllback,
} from '../../utils/fetchQuickstarts';
import { SortOrder } from '../../utils/filtersInterface';

export interface GlobalLearningResourcesFiltersProps {
  loader: UnwrappedLoader<typeof fetchAllData>;
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: React.Dispatch<
    React.SetStateAction<FetchQuickstartsOptions>
  >;
  setSortOrder: React.Dispatch<React.SetStateAction<SortOrder>>;
}

const GlobalLearningResourcesFilters: React.FC<
  GlobalLearningResourcesFiltersProps
> = ({ loader, loaderOptions, setLoaderOptions, setSortOrder }) => {
  const chrome = useChrome();

  const [filters] = loader(chrome.auth.getUser);

  const handleInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    setLoaderOptions({
      ...(loaderOptions || loaderOptionsFalllback),
      'display-name': value,
    });
  };

  const hasActiveFilters = Object.values(loaderOptions).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <Stack
      hasGutter
      className="lr-c-global-learning-resources-page__filters pf-v5-u-p-lg"
    >
      <StackItem>
        <Split className="lr-c-global-learning-resources-page__filters--wrap">
          <SplitItem isFilled>
            <TextInputGroup className="lr-c-global-learning-resources-page__filters--input">
              <TextInputGroupMain
                className="lr-c-global-learning-resources-page__filters--input"
                icon={<FilterIcon />}
                value={loaderOptions['display-name']}
                placeholder="Find by name ..."
                onChange={handleInputChange}
              />
            </TextInputGroup>
          </SplitItem>
          <SplitItem>
            <Button
              className="lr-c-global-learning-resources-page__filters--sort"
              variant="plain"
              onClick={() =>
                setSortOrder((prev: SortOrder) =>
                  prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
                )
              }
            >
              <SortAmountDownAltIcon />
            </Button>
          </SplitItem>
        </Split>
      </StackItem>

      <StackItem className="lr-c-global-learning-resources-page__filters--clear-filters">
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
          <FlexItem>
            <Button variant="plain" onClick={() => setLoaderOptions({})}>
              <TextContent>
                <Text
                  component={hasActiveFilters ? 'a' : TextVariants.small}
                  className={`lr-c-global-learning-resources-page__filters--link ${
                    hasActiveFilters
                      ? 'pf-m-link'
                      : 'pf-u-text-muted lr-c-global-learning-resources-page__filters--disabled'
                  }`}
                >
                  Clear filters
                </Text>
              </TextContent>
            </Button>
          </FlexItem>
        </Flex>
      </StackItem>

      <div className="lr-c-global-learning-resources-page__filters--categories">
        {filters.data.categories.map(
          (category: FiltersCategory, index: number) => (
            <StackItem key={index}>
              <GlobalLearningResourcesFiltersCategory
                categoryId={category.categoryId}
                categoryName={category.categoryName}
                categoryData={category.categoryData}
                loaderOptions={loaderOptions}
                setLoaderOptions={setLoaderOptions}
              />
            </StackItem>
          )
        )}
      </div>
    </Stack>
  );
};

export default GlobalLearningResourcesFilters;
