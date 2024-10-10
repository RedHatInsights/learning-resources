import React from 'react';
import {
  Button,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInputGroup,
  TextInputGroupMain,
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

interface GlobalLearningResourcesFiltersProps {
  loader: UnwrappedLoader<typeof fetchAllData>;
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: (options: FetchQuickstartsOptions) => void;
}

const GlobalLearningResourcesFilters: React.FC<
  GlobalLearningResourcesFiltersProps
> = ({ loader, loaderOptions, setLoaderOptions }) => {
  const chrome = useChrome();

  const [filters] = loader(chrome.auth.getUser);

  const handleInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      setLoaderOptions({
        ...(loaderOptions || loaderOptionsFalllback),
        'display-name': trimmedValue,
      });
    }
  };

  return (
    <Stack
      hasGutter
      className="lr-c-global-learning-resources-page__filters pf-v5-u-p-lg"
    >
      <StackItem>
        <Split>
          <SplitItem isFilled>
            <TextInputGroup>
              <TextInputGroupMain
                icon={<FilterIcon />}
                value={loaderOptions['display-name']}
                placeholder="Find by name ..."
                onChange={handleInputChange}
              />
            </TextInputGroup>
          </SplitItem>
          <SplitItem>
            <Button variant="plain">
              <SortAmountDownAltIcon />
            </Button>
          </SplitItem>
        </Split>
      </StackItem>
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
    </Stack>
  );
};

export default GlobalLearningResourcesFilters;
