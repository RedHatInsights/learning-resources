import { FetchQuickstartsOptions } from './fetchQuickstarts';
import { TagsEnum } from './tagsEnum';

export interface Filter {
  id: string;
  cardLabel: string;
  filterLabel: string;
  icon?: string;
}

export interface CategoryMap {
  [filterId: string]: Filter;
}

export interface FilterMap {
  [categoryId: string]: CategoryMap;
}

export type ValidTags = {
  [TagsEnum.ProductFamilies]: Filter[];
  [TagsEnum.UseCase]: Filter[];
};

export type MenuHeights = {
  [key: string]: number;
};

export const updateCategory = (
  isChecked: boolean,
  filterId: string,
  currentCategory: string | string[] | undefined,
  categoryKey: keyof FetchQuickstartsOptions
): FetchQuickstartsOptions => {
  const updatedCategory = isChecked
    ? [...(Array.isArray(currentCategory) ? currentCategory : []), filterId]
    : Array.isArray(currentCategory)
    ? currentCategory.filter((id) => id !== filterId)
    : [];

  return {
    [categoryKey]: updatedCategory,
  };
};
