import { QuickStartCatalogFilterCountWrapper } from '@patternfly/quickstarts';
import { Level, LevelItem, SearchInput } from '@patternfly/react-core';
import React from 'react';

import './CatalogFilter.scss';

const CatalogFilter = ({
  quickStartsCount,
  onSearchInputChange,
}: {
  onSearchInputChange: (value: string) => void;
  quickStartsCount: number;
}) => {
  return (
    <Level className="pf-v5-u-pt-sm pf-v5-u-pb-sm lr-c-catalog__filter">
      <LevelItem className="pfext-quick-start-catalog-filter__input">
        <SearchInput
          placeholder="Filter by keywords..."
          onChange={(_ev, str) => onSearchInputChange(str)}
        />
      </LevelItem>
      <LevelItem className="pf-v5-u-mr-md">
        <QuickStartCatalogFilterCountWrapper
          quickStartsCount={quickStartsCount}
        />
      </LevelItem>
    </Level>
  );
};

export default CatalogFilter;
