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
