import { ExtendedQuickstart } from './fetchQuickstarts';
import { Filter, FilterMap, ValidTags } from './filtersInterface';
import { TagsEnum } from './tagsEnum';

function isValidTagType(
  key: string,
  storage: ValidTags
): key is keyof ValidTags {
  return Object.prototype.hasOwnProperty.call(storage, key);
}

const findQuickstartFilterTags = (
  filterMap: FilterMap,
  QuickStart: ExtendedQuickstart
) => {
  const modifiedTags = QuickStart.metadata.tags.reduce<{
    [TagsEnum.ProductFamilies]: Filter[];
    [TagsEnum.UseCase]: Filter[];
  }>(
    (acc, curr) => {
      const key = curr.kind;
      if (isValidTagType(key, acc)) {
        const newEntry = filterMap[curr.kind][curr.value];
        if (newEntry) {
          acc[key].push(newEntry);
        }
      }
      return acc;
    },
    {
      [TagsEnum.ProductFamilies]: [],
      [TagsEnum.UseCase]: [],
    }
  );

  return modifiedTags;
};

export default findQuickstartFilterTags;
