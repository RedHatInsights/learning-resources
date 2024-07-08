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
    tagColor: 'cyan',
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

export const itemKindMeta: {
  [k in keyof typeof rawItemKindMeta]: ItemMeta;
} = rawItemKindMeta;

export type ItemKind = keyof typeof itemKindMeta;

export function isItemKind(kind: string): kind is ItemKind {
  return Object.hasOwn(itemKindMeta, kind);
}
