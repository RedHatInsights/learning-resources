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
import {
  FilterIcon,
  LongArrowAltDownIcon,
  LongArrowAltUpIcon,
} from '@patternfly/react-icons';
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
import { SortByDirection } from '@patternfly/react-table';

interface GlobalLearningResourcesFiltersProps {
  loader: UnwrappedLoader<typeof fetchAllData>;
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: React.Dispatch<
    React.SetStateAction<FetchQuickstartsOptions>
  >;
  sortOrder: SortByDirection;
  setSortOrder: React.Dispatch<React.SetStateAction<SortByDirection>>;
}

const GlobalLearningResourcesFilters: React.FC<
  GlobalLearningResourcesFiltersProps
> = ({ loader, loaderOptions, setLoaderOptions, sortOrder, setSortOrder }) => {
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
                setSortOrder((prev: SortByDirection) =>
                  prev === SortByDirection.asc
                    ? SortByDirection.desc
                    : SortByDirection.asc
                )
              }
            >
              {sortOrder === SortByDirection.asc ? (
                <LongArrowAltUpIcon />
              ) : (
                <LongArrowAltDownIcon />
              )}
            </Button>
          </SplitItem>
        </Split>
      </StackItem>

      <StackItem className="lr-c-global-learning-resources-page__filters--clear-filters">
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
          <FlexItem>
            <Button variant="plain" onClick={() => setLoaderOptions({})}>
              <TextContent>
                <Text component={TextVariants.small}>Clear filters</Text>
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
