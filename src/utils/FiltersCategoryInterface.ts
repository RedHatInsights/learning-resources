import { FetchQuickstartsOptions } from './fetchQuickstarts';

export interface FilterItem {
  id: string;
  filterLabel: string;
  cardLabel: string;
  color?: string;
  icon?: string;
}

export interface CategoryGroup {
  group: string;
  data: FilterItem[];
}

export type CategoryID = keyof FetchQuickstartsOptions;

/** Keys of FetchQuickstartsOptions whose value type is string or string[] (filterable categories). */
export type FilterCategoryID = Exclude<
  {
    [K in keyof FetchQuickstartsOptions]: FetchQuickstartsOptions[K] extends
      | string
      | string[]
      | undefined
      ? K
      : never;
  }[keyof FetchQuickstartsOptions],
  undefined
>;

export interface FiltersCategory {
  categoryId: FilterCategoryID;
  categoryName: string;
  categoryData: CategoryGroup[];
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: React.Dispatch<
    React.SetStateAction<FetchQuickstartsOptions>
  >;
}

export const FiltersCategoryMetadata: Record<CategoryID, string> = {
  'product-families': 'Product families',
  content: 'Content type',
  'use-case': 'Use case',
  'display-name': 'Display name',
  bundle: '',
  fuzzy: '',
};

export const FiltersMetadata: Record<string, string> = {
  // Product families
  ansible: 'Ansible',
  openshift: 'OpenShift',
  rhel: 'RHEL (Red Hat Enterprise Linux)',
  insights: 'RHEL',
  iam: 'IAM (Identity and Access Management)',
  settings: 'Settings',
  'subscriptions-services': 'Subscriptions services',

  // Content type
  documentation: 'Documentation',
  learningPath: 'Learning paths',
  quickstart: 'Quick start',
  otherResource: 'Other content types',

  // Use case
  automation: 'Automation',
  clusters: 'Clusters',
  containers: 'Containers',
  'data-services': 'Data services',
  deploy: 'Deploy',
  'identity-and-access': 'Identity and access',
  images: 'Images',
  infrastructure: 'Infrastructure',
  observability: 'Observability',
  security: 'Security',
  'spend-management': 'Spend management',
  'system-configuration': 'System configuration',
};

export interface FilterData {
  categories: FiltersCategory[];
}

export interface FiltersAPI {
  data: {
    categories: FiltersCategory[];
  };
}
