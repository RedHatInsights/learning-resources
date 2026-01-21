import { defineMessages } from 'react-intl';

const messages = defineMessages({
  // Common / Tabs
  tabFindHelp: {
    id: 'helpPanel.tabs.findHelp',
    defaultMessage: 'Learn',
  },
  tabSearch: {
    id: 'helpPanel.tabs.search',
    defaultMessage: 'Search',
  },
  tabLearn: {
    id: 'helpPanel.tabs.learn',
    defaultMessage: 'Learn',
  },
  tabKnowledgeBase: {
    id: 'helpPanel.tabs.knowledgeBase',
    defaultMessage: 'Knowledge base',
  },
  tabApis: {
    id: 'helpPanel.tabs.apis',
    defaultMessage: 'APIs',
  },
  tabMySupportCases: {
    id: 'helpPanel.tabs.mySupportCases',
    defaultMessage: 'My support cases',
  },
  tabSupport: {
    id: 'helpPanel.tabs.support',
    defaultMessage: 'Support',
  },
  tabNewTab: {
    id: 'helpPanel.tabs.newTab',
    defaultMessage: 'New tab',
  },
  tabAddTab: {
    id: 'helpPanel.tabs.addTab',
    defaultMessage: 'Add tab',
  },

  // Help Panel Header
  helpPanelTitle: {
    id: 'helpPanel.title',
    defaultMessage: 'Help',
  },
  redHatStatusPage: {
    id: 'helpPanel.redHatStatusPage',
    defaultMessage: 'Red Hat status page',
  },
  askRedHat: {
    id: 'helpPanel.askRedHat',
    defaultMessage: 'Ask Red Hat',
  },
  loading: {
    id: 'helpPanel.loading',
    defaultMessage: 'Loading...',
  },

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
  learningResourcesWithCount: {
    id: 'helpPanel.learn.resourcesWithCount',
    defaultMessage: 'Learning resources ({count})',
  },
  filterByScopeAriaLabel: {
    id: 'helpPanel.learn.filterByScopeAriaLabel',
    defaultMessage: 'Filter by scope',
  },
  learningResourcesAriaLabel: {
    id: 'helpPanel.learn.learningResourcesAriaLabel',
    defaultMessage: 'Learning resources',
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
  apiDocumentationWithCount: {
    id: 'helpPanel.api.documentationWithCount',
    defaultMessage: 'API Documentation ({count})',
  },
  apiResourcesAriaLabel: {
    id: 'helpPanel.api.resourcesAriaLabel',
    defaultMessage: 'API resources',
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
  supportColumnTitle: {
    id: 'helpPanel.support.columnTitle',
    defaultMessage: 'Title',
  },
  supportColumnStatus: {
    id: 'helpPanel.support.columnStatus',
    defaultMessage: 'Status',
  },
  supportStatusWaitingOnCustomer: {
    id: 'helpPanel.support.statusWaitingOnCustomer',
    defaultMessage: 'Waiting on Customer',
  },
  supportStatusWaitingOnRedHat: {
    id: 'helpPanel.support.statusWaitingOnRedHat',
    defaultMessage: 'Waiting on Red Hat',
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

  // Quickstart Panel
  quickstartNoDataAvailable: {
    id: 'helpPanel.quickstart.noDataAvailable',
    defaultMessage: 'No quickstart data available.',
  },
  quickstartOpenInNewWindow: {
    id: 'helpPanel.quickstart.openInNewWindow',
    defaultMessage: 'Open in new window',
  },
  quickstartDurationLabel: {
    id: 'helpPanel.quickstart.durationLabel',
    defaultMessage: 'Quick start | {minutes} minutes',
  },
  quickstartProgressTitle: {
    id: 'helpPanel.quickstart.progressTitle',
    defaultMessage: 'Progress',
  },
  quickstartTasksCompleted: {
    id: 'helpPanel.quickstart.tasksCompleted',
    defaultMessage: '{completed} of {total} tasks completed',
  },
  quickstartViewPrerequisites: {
    id: 'helpPanel.quickstart.viewPrerequisites',
    defaultMessage: 'View prerequisites ({count})',
  },
  quickstartTaskListIntro: {
    id: 'helpPanel.quickstart.taskListIntro',
    defaultMessage:
      'In this quick start, you will complete {count, plural, one {# task} other {# tasks}}:',
  },
  quickstartStartButton: {
    id: 'helpPanel.quickstart.startButton',
    defaultMessage: 'Start',
  },
  quickstartBackToOverview: {
    id: 'helpPanel.quickstart.backToOverview',
    defaultMessage: 'Back to overview',
  },
  quickstartBack: {
    id: 'helpPanel.quickstart.back',
    defaultMessage: 'Back',
  },
  quickstartTaskProgress: {
    id: 'helpPanel.quickstart.taskProgress',
    defaultMessage: '{current} of {total}',
  },
  quickstartCheckYourWork: {
    id: 'helpPanel.quickstart.checkYourWork',
    defaultMessage: 'Check your work',
  },
  quickstartMarkCompleteAndNext: {
    id: 'helpPanel.quickstart.markCompleteAndNext',
    defaultMessage: 'Mark complete & next',
  },
  quickstartMarkComplete: {
    id: 'helpPanel.quickstart.markComplete',
    defaultMessage: 'Mark complete',
  },
  quickstartNext: {
    id: 'helpPanel.quickstart.next',
    defaultMessage: 'Next',
  },
  quickstartContinue: {
    id: 'helpPanel.quickstart.continue',
    defaultMessage: 'Continue',
  },
  quickstartReviewYes: {
    id: 'helpPanel.quickstart.reviewYes',
    defaultMessage: 'Yes',
  },
  quickstartReviewNo: {
    id: 'helpPanel.quickstart.reviewNo',
    defaultMessage: 'No',
  },
  quickstartRestart: {
    id: 'helpPanel.quickstart.restart',
    defaultMessage: 'Restart',
  },
});

export default messages;
