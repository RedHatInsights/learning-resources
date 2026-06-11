import { SearchResult } from './SearchResultItem';

interface StaticRecommendedItem {
  kind: 'static';
  title: string;
  description: string;
  type: SearchResult['type'];
  url: string;
  bundleTags?: string[];
}

interface DynamicRecommendedItem {
  kind: 'dynamic';
  resourceName: string;
}

export type RecommendedItem = StaticRecommendedItem | DynamicRecommendedItem;

export const RECOMMENDED_CONTENT_LIMIT = 5;

export const bundleRecommendedContent: Record<string, RecommendedItem[]> = {
  openshift: [
    {
      kind: 'static',
      title: 'Account Management Service',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/accounts-management-service',
      bundleTags: ['openshift'],
    },
    {
      kind: 'dynamic',
      resourceName: 'rosa-osd-edit-cluster-autoscaling',
    },
    {
      kind: 'static',
      title: 'Managing clusters',
      description: '',
      type: 'documentation',
      url: 'https://docs.redhat.com/en/documentation/openshift_cluster_manager/1-latest/html/managing_clusters/index',
      bundleTags: ['openshift'],
    },
    {
      kind: 'static',
      title: 'Related documentation for OpenShift Cluster Manager',
      description: '',
      type: 'documentation',
      url: 'https://docs.redhat.com/en/documentation/openshift_cluster_manager/1-latest',
      bundleTags: ['openshift'],
    },
    {
      kind: 'static',
      title: 'What data is sent to Red Hat for cost management and telemetry?',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/6512501',
      bundleTags: ['openshift'],
    },
  ],

  rhel: [
    {
      kind: 'static',
      title: 'Assess security vulnerabilities',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_insights/1-latest/html/assessing_and_monitoring_security_vulnerabilities_on_rhel_systems/index',
      bundleTags: ['rhel'],
    },
    {
      kind: 'dynamic',
      resourceName: 'insights-tasks-conversion',
    },
    {
      kind: 'static',
      title: 'Related documentation for Insights',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_insights/',
      bundleTags: ['rhel'],
    },
    {
      kind: 'static',
      title: 'System Information Collected by Red Hat Insights',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/1598863',
      bundleTags: ['rhel'],
    },
    {
      kind: 'static',
      title: 'Vulnerability Management',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/vulnerability',
      bundleTags: ['rhel'],
    },
  ],

  insights: [
    {
      kind: 'static',
      title: 'Assess security vulnerabilities',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_insights/1-latest/html/assessing_and_monitoring_security_vulnerabilities_on_rhel_systems/index',
      bundleTags: ['rhel'],
    },
    {
      kind: 'dynamic',
      resourceName: 'insights-tasks-conversion',
    },
    {
      kind: 'static',
      title: 'Related documentation for Insights',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_insights/',
      bundleTags: ['rhel'],
    },
    {
      kind: 'static',
      title: 'System Information Collected by Red Hat Insights',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/1598863',
      bundleTags: ['rhel'],
    },
    {
      kind: 'static',
      title: 'Vulnerability Management',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/vulnerability',
      bundleTags: ['rhel'],
    },
  ],

  ansible: [
    {
      kind: 'static',
      title: 'Automation Analytics Security and Data Handling',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/4501671',
      bundleTags: ['ansible'],
    },
    {
      kind: 'static',
      title: 'Automation Hub',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/automation-hub',
      bundleTags: ['ansible'],
    },
    {
      kind: 'static',
      title: 'Create your first Ansible Playbook',
      description: '',
      type: 'documentation',
      url: 'https://docs.ansible.com/ansible/latest/getting_started/get_started_playbook.html',
      bundleTags: ['ansible'],
    },
    {
      kind: 'static',
      title: 'Getting started with Automation Hub',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_ansible_automation_platform/2.4/html/getting_started_with_automation_hub',
      bundleTags: ['ansible'],
    },
    {
      kind: 'static',
      title: 'Related documentation for Ansible',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_ansible_automation_platform/',
      bundleTags: ['ansible'],
    },
  ],

  iam: [
    {
      kind: 'static',
      title:
        'How to switch from Basic Auth to Certificate Authentication for Red Hat Insights',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/7040601',
      bundleTags: ['iam', 'rhel'],
    },
    {
      kind: 'static',
      title: 'Related console documentation',
      description: '',
      type: 'documentation',
      url: 'https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest',
      bundleTags: ['settings', 'iam'],
    },
    {
      kind: 'static',
      title: 'Role-based Access Control',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/rbac',
      bundleTags: ['iam'],
    },
    {
      kind: 'static',
      title: 'Setting up User Access',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_hybrid_cloud_console/1-latest/html/user_access_configuration_guide_for_role-based_access_control_rbac/index',
      bundleTags: ['iam'],
    },
    {
      kind: 'static',
      title:
        'Transition of Red Hat Hybrid Cloud Console APIs from basic authentication to token-based authentication via service accounts',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/7036194',
      bundleTags: ['iam'],
    },
  ],

  settings: [
    {
      kind: 'static',
      title:
        'Azure cloud integrations (sources) on Hybrid Cloud Console to unlock Red Hat Gold Images in Microsoft Azure',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/6961606',
      bundleTags: ['settings'],
    },
    {
      kind: 'static',
      title: 'Integration with third-party applications',
      description: '',
      type: 'documentation',
      url: 'https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest/html/integrating_the_red_hat_hybrid_cloud_console_with_third-party_applications/index',
      bundleTags: ['settings'],
    },
    {
      kind: 'static',
      title: 'Integrations',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/integrations',
      bundleTags: ['settings'],
    },
    {
      kind: 'static',
      title: 'Notifications',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/notifications',
      bundleTags: ['settings'],
    },
    {
      kind: 'static',
      title: 'Related console documentation',
      description: '',
      type: 'documentation',
      url: 'https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest',
      bundleTags: ['settings', 'iam'],
    },
  ],

  'subscriptions-services': [
    {
      kind: 'static',
      title: 'Creating an activation key',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/subscription_central/1-latest/html/getting_started_with_activation_keys_on_the_hybrid_cloud_console',
      bundleTags: ['subscriptions-services'],
    },
    {
      kind: 'static',
      title: 'Related documentation for subscriptions',
      description: '',
      type: 'documentation',
      url: 'https://access.redhat.com/documentation/en-us/subscription_central',
      bundleTags: ['subscriptions-services'],
    },
    {
      kind: 'static',
      title: 'Simple Content Access',
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/simple-content-access',
      bundleTags: ['subscriptions-services'],
    },
    {
      kind: 'static',
      title: 'Subscriptions v2',
      description: '',
      type: 'api',
      url: 'https://developers.redhat.com/api-catalog/api/rhsm-subscriptions-v2',
      bundleTags: ['subscriptions-services', 'openshift', 'rhel'],
    },
    {
      kind: 'static',
      title:
        "Transition of Red Hat's subscription services to the Red Hat Hybrid Cloud Console (console.redhat.com)",
      description: '',
      type: 'kb',
      url: 'https://access.redhat.com/articles/transition_of_subscription_services_to_the_hybrid_cloud_console',
      bundleTags: ['subscriptions-services'],
    },
  ],
};

/**
 * Default recommended content shown when the user is not inside any bundle
 * (e.g. home/landing page) or when the "All" toggle is selected.
 */
export const defaultRecommendedContent: RecommendedItem[] = [
  {
    kind: 'static',
    title: 'Related console documentation',
    description: '',
    type: 'documentation',
    url: 'https://docs.redhat.com/en/documentation/red_hat_hybrid_cloud_console/1-latest',
    bundleTags: ['settings', 'iam'],
  },
  {
    kind: 'static',
    title: 'Related documentation for OpenShift Cluster Manager',
    description: '',
    type: 'documentation',
    url: 'https://docs.redhat.com/en/documentation/openshift_cluster_manager/1-latest',
    bundleTags: ['openshift'],
  },
  {
    kind: 'static',
    title: 'Related documentation for subscriptions',
    description: '',
    type: 'documentation',
    url: 'https://access.redhat.com/documentation/en-us/subscription_central',
    bundleTags: ['subscriptions-services'],
  },
  {
    kind: 'static',
    title: 'Related documentation for Ansible',
    description: '',
    type: 'documentation',
    url: 'https://access.redhat.com/documentation/en-us/red_hat_ansible_automation_platform/',
    bundleTags: ['ansible'],
  },
  {
    kind: 'static',
    title: 'Related documentation for Insights',
    description: '',
    type: 'documentation',
    url: 'https://access.redhat.com/documentation/en-us/red_hat_insights/',
    bundleTags: ['rhel'],
  },
];
