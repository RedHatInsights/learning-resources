import { QuickStartType } from '@patternfly/quickstarts';

const rawItemKindMeta = Object.freeze({
  documentation: {
    displayName: 'Documentation',
    tagColor: 'orange',
    fields: {
      url: true,
    },
    extraMetadata: {
      externalDocumentation: true,
    },
  },
  quickstart: {
    displayName: 'Quickstart',
    tagColor: 'green',
    hasDuration: true,
    fields: {
      duration: true,
    },
    hasTasks: true,
    extraMetadata: {},
  },
  learningPath: {
    displayName: 'Learning path',
    tagColor: 'teal',
    fields: {
      url: true,
    },
    extraMetadata: {
      learningPath: true,
    },
  },
  other: {
    displayName: 'Other',
    tagColor: 'purple',
    fields: {
      url: true,
    },
    extraMetadata: {
      otherResource: true,
    },
  },
} as const);

export type CreatorWizardStage =
  | { type: 'card' }
  | { type: 'panel-overview' }
  | {
      type: 'task';
      index: number;
    }
  | { type: 'download' };

export type ItemMeta = {
  displayName: string;
  tagColor: QuickStartType['color'];
  fields: {
    url?: boolean;
    duration?: boolean;
  };
  hasTasks?: boolean;
  extraMetadata: object;
};

const itemKindMeta: {
  [k in keyof typeof rawItemKindMeta]: ItemMeta;
} = rawItemKindMeta;

export type ItemKind = keyof typeof itemKindMeta;

export function isItemKind(kind: string): kind is ItemKind {
  return Object.hasOwn(itemKindMeta, kind);
}

export function metaForKind(kind: ItemKind): ItemMeta {
  return itemKindMeta[kind];
}

export const ALL_ITEM_KINDS = Object.freeze(
  Object.keys(itemKindMeta)
) as readonly ItemKind[];

export const ALL_KIND_ENTRIES: readonly [ItemKind, ItemMeta][] = Object.entries(
  itemKindMeta
).map(([k, v]) => {
  if (!isItemKind(k)) throw new Error('unexpected item kind');
  return [k, v];
});
