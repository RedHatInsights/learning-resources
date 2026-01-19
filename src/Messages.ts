import { defineMessages } from 'react-intl';

const messages = defineMessages({
  // Search Panel
  searchPanelDescription: {
    id: 'helpPanel.search.description',
    defaultMessage:
      'Find documentation, quick starts, API documentation, knowledgebase articles, and open support tickets.',
  },
  searchPanelPlaceholder: {
    id: 'helpPanel.search.placeholder',
    defaultMessage: 'Search for topics, products, use cases, etc.',
  },
  searchPanelRecentSearch: {
    id: 'helpPanel.search.recentSearch',
    defaultMessage: 'Recent Search queries',
  },
  searchPanelRecommendedContent: {
    id: 'helpPanel.search.recommendedContent',
    defaultMessage: 'Recommended content',
  },

  // Learn Panel
  learnPanelDescription: {
    id: 'helpPanel.learn.description',
    defaultMessage:
      'Find product documentation, quick starts, learning paths, and more. For a more detailed view, browse the',
  },
  allLearningCatalogLinkText: {
    id: 'helpPanel.learn.allLearningCatalogLink',
    defaultMessage: 'All Learning Catalog',
  },
  contentTypeLabel: {
    id: 'helpPanel.learn.contentTypeLabel',
    defaultMessage: 'Content type',
  },
  showBookmarkedOnlyLabel: {
    id: 'helpPanel.learn.showBookmarkedOnly',
    defaultMessage: 'Show bookmarked only',
  },
  clearAllFiltersButtonText: {
    id: 'helpPanel.learn.clearAllFilters',
    defaultMessage: 'Clear all filters',
  },
  learningResourcesCountLabel: {
    id: 'helpPanel.learn.resourcesCount',
    defaultMessage: 'Learning resources',
  },
  allToggleText: {
    id: 'helpPanel.common.allToggle',
    defaultMessage: 'All',
  },
  noLearningResourcesMessage: {
    id: 'helpPanel.learn.noResourcesFound',
    defaultMessage: 'No learning resources found matching your criteria.',
  },

  // API Panel
  apiPanelDescription: {
    id: 'helpPanel.api.description',
    defaultMessage:
      'Browse the APIs for Hybrid Cloud Console services. See full API documentation on the',
  },
  apiDocumentationCatalogLinkText: {
    id: 'helpPanel.api.documentationCatalogLink',
    defaultMessage: 'API Documentation Catalog',
  },
  apiDocumentationCountLabel: {
    id: 'helpPanel.api.documentationCount',
    defaultMessage: 'API Documentation',
  },
  noApiDocsMessage: {
    id: 'helpPanel.api.noDocsFound',
    defaultMessage: 'No API documentation found matching your criteria.',
  },

  // Support Panel
  noOpenSupportCasesTitle: {
    id: 'helpPanel.support.noOpenCasesTitle',
    defaultMessage: 'No open support cases',
  },
  noSupportCasesMessage: {
    id: 'helpPanel.support.noOpenCasesMessage',
    defaultMessage: "We can't find any active support cases opened by you.",
  },
  openSupportCaseButtonText: {
    id: 'helpPanel.support.openSupportCaseButton',
    defaultMessage: 'Open a support case',
  },
  supportPanelDescription: {
    id: 'helpPanel.support.description',
    defaultMessage:
      'Quickly see the status on all of your open support cases. To manage support cases or open a new one, visit the',
  },
  customerPortalLinkText: {
    id: 'helpPanel.support.customerPortalLink',
    defaultMessage: 'Customer Portal',
  },
  supportCasesTableTitle: {
    id: 'helpPanel.support.casesTableTitle',
    defaultMessage: 'My open support cases',
  },

  // Knowledge Base Panel
  knowledgeBaseTitle: {
    id: 'helpPanel.kb.title',
    defaultMessage: 'Knowledge base',
  },

  // Content Types
  contentTypeDocumentation: {
    id: 'helpPanel.contentType.documentation',
    defaultMessage: 'Documentation',
  },
  contentTypeQuickstarts: {
    id: 'helpPanel.contentType.quickstarts',
    defaultMessage: 'Quick starts',
  },
  contentTypeLearningPaths: {
    id: 'helpPanel.contentType.learningPaths',
    defaultMessage: 'Learning paths',
  },
  contentTypeOther: {
    id: 'helpPanel.contentType.other',
    defaultMessage: 'Other',
  },
});

export default messages;
