import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInputGroup,
  TextInputGroupMain,
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
import classnames from 'classnames';

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

  const hasActiveFilters = Object.values(loaderOptions).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  );

  return (
    <Stack
      hasGutter
      className="lr-c-global-learning-resources-page__filters pf-v6-u-p-lg"
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
              icon={
                sortOrder === SortByDirection.asc ? (
                  <LongArrowAltUpIcon />
                ) : (
                  <LongArrowAltDownIcon />
                )
              }
              className="lr-c-global-learning-resources-page__filters--sort"
              variant="plain"
              onClick={() =>
                setSortOrder((prev: SortByDirection) =>
                  prev === SortByDirection.asc
                    ? SortByDirection.desc
                    : SortByDirection.asc
                )
              }
            />
          </SplitItem>
        </Split>
      </StackItem>

      <StackItem className="lr-c-global-learning-resources-page__filters--clear-filters">
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
          <FlexItem>
            <Button
              icon={
                <Content
                  className={classnames(
                    'lr-c-global-learning-resources-page__filters--link',
                    {
                      'pf-m-link': hasActiveFilters,
                      'pf-u-text-muted lr-c-global-learning-resources-page__filters--disabled':
                        !hasActiveFilters,
                    }
                  )}
                  component={hasActiveFilters ? 'a' : ContentVariants.small}
                >
                  Clear filters
                </Content>
              }
              variant="plain"
              onClick={() => setLoaderOptions({})}
            />
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
