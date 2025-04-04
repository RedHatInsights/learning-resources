import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuContent,
  MenuList,
  MenuToggle,
  Text,
  TextContent,
  TextInputGroup,
  TextInputGroupMain,
  TextVariants,
} from '@patternfly/react-core';
import { FilterIcon, SortAmountDownAltIcon } from '@patternfly/react-icons';
import './GlobalLearningResourcesFilters.scss';
import './GlobalLearningResourcesFiltersMobile.scss';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { UnwrappedLoader } from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import {
  FetchQuickstartsOptions,
  loaderOptionsFalllback,
} from '../../utils/fetchQuickstarts';
import GlobalLearningResourcesFiltersCategoryMobile from './GlobalLearningResourcesFiltersCategoryMobile';
import AppliedFilters from './AppliedFilters';
import { MenuHeights } from '../../utils/filtersInterface';
import fetchAllData from '../../utils/fetchAllData';
import { SortByDirection } from '@patternfly/react-table';

interface GlobalLearningResourcesFiltersMobileProps {
  loader: UnwrappedLoader<typeof fetchAllData>;
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: React.Dispatch<
    React.SetStateAction<FetchQuickstartsOptions>
  >;
  setSortOrder: React.Dispatch<React.SetStateAction<SortByDirection>>;
}

export const GlobalLearningResourcesFiltersMobile: React.FC<
  GlobalLearningResourcesFiltersMobileProps
> = ({ loader, loaderOptions, setLoaderOptions, setSortOrder }) => {
  const chrome = useChrome();
  const [filters] = loader(chrome.auth.getUser);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuDrilledIn, setMenuDrilledIn] = useState<string[]>([]);
  const [drilldownPath, setDrilldownPath] = useState<string[]>([]);

  const [menuHeights, setMenuHeights] = React.useState<MenuHeights>({
    rootMenu: 140,
  });

  const toggleMainMenu = () => {
    if (activeMenu === null) {
      // Reset to the main menu when reopening
      setActiveMenu('rootMenu');
      setMenuDrilledIn([]);
      setDrilldownPath([]);
    } else {
      setActiveMenu(null); // Close the menu
    }
  };

  const handleInputChange = (
    _event: React.FormEvent<HTMLInputElement>,
    value: string
  ) => {
    if (value !== loaderOptions['display-name']) {
      setLoaderOptions({
        ...(loaderOptions || loaderOptionsFalllback),
        'display-name': value,
      });
    }
  };

  const drillIn = (
    _event: React.KeyboardEvent | React.MouseEvent,
    fromMenuId: string,
    toMenuId: string,
    pathId: string
  ) => {
    setMenuDrilledIn([...menuDrilledIn, fromMenuId]);
    setDrilldownPath([...drilldownPath, pathId]);
    setActiveMenu(toMenuId);
  };

  const drillOut = (
    _event: React.KeyboardEvent | React.MouseEvent,
    toMenuId: string
  ) => {
    setMenuDrilledIn(menuDrilledIn.slice(0, -1));
    setDrilldownPath(drilldownPath.slice(0, -1));
    setActiveMenu(toMenuId);
  };

  const setHeight = (menuId: string, height: number) => {
    if (
      menuHeights[menuId] === undefined ||
      (menuId !== 'rootMenu' && menuHeights[menuId] !== height)
    ) {
      setMenuHeights({ ...menuHeights, [menuId]: height });
    }
  };

  const hasAppliedFilters = Object.values(loaderOptions).some(
    (filters) => Array.isArray(filters) && filters.length > 0
  );

  return (
    <div className="lr-c-global-learning-resources-page__filters-mobile pf-v5-u-p-md">
      <div className="lr-c-global-learning-resources-page__filters-container">
        {/* Input Row, MenuToggle, and Buttons */}
        <div className="lr-c-global-learning-resources-page__filters-row">
          <TextInputGroup className="lr-c-global-learning-resources-page__filters--input">
            <TextInputGroupMain
              icon={<FilterIcon />}
              value={loaderOptions['display-name']}
              placeholder="Find by name ..."
              onChange={handleInputChange}
            />
          </TextInputGroup>
          <div className="lr-c-global-learning-resources-page__filters-row--wrapper">
            <MenuToggle
              variant="plain"
              onClick={toggleMainMenu}
              isExpanded={activeMenu !== null}
              aria-expanded={activeMenu !== null}
              aria-label="Filter menu toggle"
              className="lr-c-global-learning-resources-page__filters--icon"
            >
              <FilterIcon />
            </MenuToggle>
            <Button
              variant="plain"
              className="lr-c-global-learning-resources-page__filters--sort"
              onClick={() =>
                setSortOrder((prev: SortByDirection) =>
                  prev === SortByDirection.asc
                    ? SortByDirection.desc
                    : SortByDirection.asc
                )
              }
            >
              <SortAmountDownAltIcon />
            </Button>
            <Button
              variant="plain"
              className="lr-c-global-learning-resources-page__filters--clear"
              onClick={() => setLoaderOptions({})}
            >
              <TextContent className="lr-c-global-learning-resources-page__filters-text">
                <Text component={TextVariants.small}>Clear Filters</Text>
              </TextContent>
            </Button>
          </div>
        </div>

        {/* Menu */}
        {activeMenu && (
          <div className="lr-c-global-learning-resources-page__menu-container">
            <Menu
              id="rootMenu"
              containsDrilldown
              drilldownItemPath={drilldownPath}
              drilledInMenus={menuDrilledIn}
              activeMenu={activeMenu}
              onDrillIn={drillIn}
              onDrillOut={drillOut}
              onGetMenuHeight={setHeight}
              className="lr-c-global-learning-resources-page__menu"
            >
              <MenuContent menuHeight={`${menuHeights[activeMenu]}px`}>
                <MenuList>
                  {filters.data.categories.map((category) => (
                    <GlobalLearningResourcesFiltersCategoryMobile
                      key={category.categoryId}
                      categoryId={category.categoryId}
                      categoryName={category.categoryName}
                      categoryData={category.categoryData}
                      loaderOptions={loaderOptions}
                      setLoaderOptions={setLoaderOptions}
                    />
                  ))}
                </MenuList>
              </MenuContent>
            </Menu>
          </div>
        )}
      </div>
      {/* Conditionally render AppliedFilters component to avoid rendering empty space */}
      {hasAppliedFilters && (
        <div className="lr-c-global-learning-resources-page__filters--applied">
          <AppliedFilters
            loaderOptions={loaderOptions}
            setLoaderOptions={setLoaderOptions}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalLearningResourcesFiltersMobile;
