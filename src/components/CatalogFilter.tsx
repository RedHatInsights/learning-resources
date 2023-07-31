import {
  QuickStartCatalogFilterCountWrapper,
  QuickStartCatalogToolbar,
} from '@patternfly/quickstarts';
import {
  SearchInput,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import React from 'react';

const CatalogFilter = ({
  quickStartsCount,
  onSearchInputChange,
}: {
  onSearchInputChange: (value: string) => void;
  quickStartsCount: number;
}) => {
  return (
    <QuickStartCatalogToolbar>
      <ToolbarContent className="pf-u-p-0">
        <ToolbarItem className="pfext-quick-start-catalog-filter__input">
          <SearchInput
            placeholder="Filter by keywords..."
            onChange={(_ev, str) => onSearchInputChange(str)}
          />
        </ToolbarItem>
        <QuickStartCatalogFilterCountWrapper
          quickStartsCount={quickStartsCount}
        />
        <ToolbarItem></ToolbarItem>
      </ToolbarContent>
    </QuickStartCatalogToolbar>
  );
};

export default CatalogFilter;
