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

export interface FiltersCategory {
  categoryId: CategoryID;
  categoryName: string;
  categoryData: CategoryGroup[];
  loaderOptions: FetchQuickstartsOptions;
  setLoaderOptions: (options: FetchQuickstartsOptions) => void;
}

export const FiltersCategoryMetadata: Record<CategoryID, string> = {
  'product-families': 'Product families',
  content: 'Content type',
  'use-case': 'Use case',
  'display-name': 'Display name',
};

export const FiltersMetadata: Record<string, string> = {
  // Product families
  ansible: 'Ansible',
  openshift: 'OpenShift',
  rhel: 'RHEL (Red Hat Enterprise Linux)',
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
