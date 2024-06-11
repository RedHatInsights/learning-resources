import { QuickStartType } from '@patternfly/quickstarts';

const rawItemKindMeta = {
  documentation: {
    displayName: 'Documentation',
    tagColor: 'orange',
    fields: {
      url: true,
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
  },
  learningPath: {
    displayName: 'Learning path',
    tagColor: 'cyan',
    fields: {
      url: true,
    },
  },
  other: {
    displayName: 'Other',
    tagColor: 'purple',
    fields: {
      url: true,
    },
  },
} as const;

export type ItemMeta = {
  displayName: string;
  tagColor: QuickStartType['color'];
  fields: {
    url?: boolean;
    duration?: boolean;
  };
  hasTasks?: boolean;
};

export const itemKindMeta: {
  [k in keyof typeof rawItemKindMeta]: ItemMeta;
} = rawItemKindMeta;

export type ItemKind = keyof typeof itemKindMeta;
