import { defineMessages } from 'react-intl';

const messages = defineMessages({
  // Help Panel header
  chatWithAssistant: {
    id: 'helpPanel.header.chatWithAssistant',
    defaultMessage: 'Chat with an assistant',
  },
  redHatStatusPage: {
    id: 'helpPanel.header.redHatStatusPage',
    defaultMessage: 'Red Hat status page',
  },
  apiDocumentation: {
    id: 'helpPanel.header.apiDocumentation',
    defaultMessage: 'API documentation',
  },
  quickstartTabTitle: {
    id: 'helpPanel.tab.quickstart',
    defaultMessage: 'Quick start',
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
    defaultMessage: 'Recent search queries',
  },
  searchPanelRecommendedContent: {
    id: 'helpPanel.search.recommendedContent',
    defaultMessage: 'Recommended content',
  },
  clearSearchHistoryText: {
    id: 'helpPanel.search.clearSearchHistory',
    defaultMessage: 'Clear search history',
  },
  noRecentSearchesText: {
    id: 'helpPanel.search.noRecentSearches',
    defaultMessage: 'No recent searches',
  },
  searchResultsHeader: {
    id: 'helpPanel.search.searchResultsHeader',
    defaultMessage: 'Search results',
  },
  noResultsFoundTitle: {
    id: 'helpPanel.search.noResultsFoundTitle',
    defaultMessage: 'No results found',
  },
  noResultsFoundDescription: {
    id: 'helpPanel.search.noResultsFoundDescription',
    defaultMessage:
      'Try adjusting your search terms or browse the different content types.',
  },
  searchResultSingular: {
    id: 'helpPanel.search.resultSingular',
    defaultMessage: 'result',
  },
  searchResultPlural: {
    id: 'helpPanel.search.resultPlural',
    defaultMessage: 'results',
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

  // Virtual Assistant Panel
  virtualAssistantNotAvailable: {
    id: 'helpPanel.va.notAvailable',
    defaultMessage:
      'Virtual Assistant is temporarily unavailable. Please try again later.',
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
  clearAllFiltersText: {
    id: 'helpPanel.filters.clearAll',
    defaultMessage: 'Clear all filters',
  },

  // Search Result Item breadcrumbs
  breadcrumbLearn: {
    id: 'helpPanel.breadcrumb.learn',
    defaultMessage: 'Learn',
  },
  breadcrumbApis: {
    id: 'helpPanel.breadcrumb.apis',
    defaultMessage: 'APIs',
  },
  breadcrumbApiDocumentation: {
    id: 'helpPanel.breadcrumb.apiDocumentation',
    defaultMessage: 'API documentation',
  },
  breadcrumbKnowledgeBase: {
    id: 'helpPanel.breadcrumb.knowledgeBase',
    defaultMessage: 'Knowledge base',
  },
  breadcrumbKnowledgeBaseArticles: {
    id: 'helpPanel.breadcrumb.knowledgeBaseArticles',
    defaultMessage: 'Knowledge base articles',
  },
  breadcrumbSupport: {
    id: 'helpPanel.breadcrumb.support',
    defaultMessage: 'Support',
  },
  breadcrumbSupportTickets: {
    id: 'helpPanel.breadcrumb.supportTickets',
    defaultMessage: 'Support tickets',
  },
  breadcrumbHybridCloudService: {
    id: 'helpPanel.breadcrumb.hybridCloudService',
    defaultMessage: 'Hybrid Cloud Console service',
  },

  // Recommended content
  noRecommendedContentMessage: {
    id: 'helpPanel.recommendedContent.noContent',
    defaultMessage: 'No recommended content available',
  },
  filterByScopeAriaLabel: {
    id: 'helpPanel.recommendedContent.filterByScope',
    defaultMessage: 'Filter by scope',
  },
  searchScopeToggleAriaLabel: {
    id: 'helpPanel.search.scopeToggleAriaLabel',
    defaultMessage: 'Filter search results by scope',
  },

  // Feedback Panel
  feedback: {
    id: 'helpPanel.feedback.title',
    defaultMessage: 'Feedback',
  },
  tellAboutExperience: {
    id: 'helpPanel.feedback.tellAboutExperience',
    defaultMessage: 'Tell us about your experience',
  },
  helpUsImproveHCC: {
    id: 'helpPanel.feedback.helpUsImprove',
    defaultMessage:
      'Help us improve the Red Hat Hybrid Cloud Console by sharing your experience. For urgent issues, {supportLink}.',
  },
  shareFeedback: {
    id: 'helpPanel.feedback.shareFeedback',
    defaultMessage: 'Share general feedback',
  },
  shareFeedbackDescription: {
    id: 'helpPanel.feedback.shareFeedbackDescription',
    defaultMessage:
      'Share your feedback with us! Do not include any personal information or other sensitive information.',
  },
  shareFeedbackTabTitle: {
    id: 'helpPanel.feedback.shareFeedbackTabTitle',
    defaultMessage: 'Share feedback',
  },
  howIsConsoleExperience: {
    id: 'helpPanel.feedback.howIsExperience',
    defaultMessage: 'What has your console experience been like so far?',
  },
  reportABug: {
    id: 'helpPanel.feedback.reportBug',
    defaultMessage: 'Report a bug',
  },
  describeBugUrgentCases: {
    id: 'helpPanel.feedback.describeBug',
    defaultMessage:
      'Describe the bug you encountered. Include where it is located and what action caused it. If this issue is urgent or blocking your workflow,',
  },
  openSupportCase: {
    id: 'helpPanel.feedback.openSupportCase',
    defaultMessage: 'Open support case',
  },
  getSupport: {
    id: 'helpPanel.feedback.getSupport',
    defaultMessage: 'Get technical help from Red Hat Support.',
  },
  informRedhatDirection: {
    id: 'helpPanel.feedback.informDirection',
    defaultMessage: 'Inform the direction of Red Hat',
  },
  researchOpportunities: {
    id: 'helpPanel.feedback.researchOpportunities',
    defaultMessage:
      'Learn about opportunities to share your feedback with our User Research Team.',
  },
  shareYourFeedback: {
    id: 'helpPanel.feedback.shareYourFeedback',
    defaultMessage: 'Share your feedback',
  },
  submitFeedback: {
    id: 'helpPanel.feedback.submitFeedback',
    defaultMessage: 'Submit feedback',
  },
  feedbackPlaceholder: {
    id: 'helpPanel.feedback.placeholder',
    defaultMessage: 'Add your general feedback here',
  },
  bugReportPlaceholder: {
    id: 'helpPanel.feedback.bugReportPlaceholder',
    defaultMessage: 'Share the details of the bug here',
  },
  feedbackAriaLabel: {
    id: 'helpPanel.feedback.ariaLabel',
    defaultMessage: 'Feedback text',
  },
  emailUnavailable: {
    id: 'helpPanel.feedback.emailUnavailable',
    defaultMessage: 'Unable to load email',
  },
  loadingEmail: {
    id: 'helpPanel.feedback.loadingEmail',
    defaultMessage: 'Loading...',
  },
  weNeverSharePersonalInformation: {
    id: 'helpPanel.feedback.weNeverShareInfo',
    defaultMessage: 'We never share your personal information.',
  },
  joinMailingList: {
    id: 'helpPanel.feedback.joinMailingList',
    defaultMessage: 'Join mailing list',
  },
  informDirectionDescription: {
    id: 'helpPanel.feedback.informDirectionDescription',
    defaultMessage:
      'By participating in feedback sessions, usability tests, and interviews with our',
  },
  userResearchTeam: {
    id: 'helpPanel.feedback.userResearchTeam',
    defaultMessage: 'User Research Team',
  },
  directInfluence: {
    id: 'helpPanel.feedback.directInfluence',
    defaultMessage:
      ", your feedback will directly influence the future of Red Hat's products. Opt in below to hear about future research opportunities via email.",
  },
  feedbackSent: {
    id: 'helpPanel.feedback.feedbackSent',
    defaultMessage: 'Feedback shared successfully',
  },
  thankYouForFeedback: {
    id: 'helpPanel.feedback.thankYouForFeedback',
    defaultMessage:
      'Thank you, we appreciate your feedback and will review it as soon as possible.',
  },
  bugReported: {
    id: 'helpPanel.feedback.bugReported',
    defaultMessage: 'Bug successfully reported',
  },
  responseSent: {
    id: 'helpPanel.feedback.responseSent',
    defaultMessage: "You've been added to the mailing list",
  },
  thankYouForInterest: {
    id: 'helpPanel.feedback.thankYouForInterest',
    defaultMessage:
      "Thanks for expressing interest in user research with Red Hat. We'll send you an email if a study is occurring for which you'd be a good fit.",
  },
  somethingWentWrong: {
    id: 'helpPanel.feedback.somethingWentWrong',
    defaultMessage: 'Something went wrong',
  },
  problemProcessingRequest: {
    id: 'helpPanel.feedback.problemProcessingRequest',
    defaultMessage:
      'We had a problem processing your request. You can reach out to',
  },
  redHatSupport: {
    id: 'helpPanel.feedback.redHatSupport',
    defaultMessage: 'Red Hat support',
  },
  submitOnlyInStageProd: {
    id: 'helpPanel.feedback.submitOnlyInStageProd',
    defaultMessage:
      'Feedback can only be submitted in prod and stage environments.',
  },
  email: {
    id: 'helpPanel.feedback.email',
    defaultMessage: 'Email',
  },
  back: {
    id: 'helpPanel.feedback.back',
    defaultMessage: 'Back',
  },
  cancel: {
    id: 'helpPanel.feedback.cancel',
    defaultMessage: 'Cancel',
  },
  close: {
    id: 'helpPanel.feedback.close',
    defaultMessage: 'Close',
  },
  feedbackType: {
    id: 'helpPanel.feedback.type.feedback',
    defaultMessage: 'Feedback',
  },
  bugType: {
    id: 'helpPanel.feedback.type.bug',
    defaultMessage: 'Bug',
  },
  researchOpportunitiesType: {
    id: 'helpPanel.feedback.type.researchOpportunities',
    defaultMessage: '[Research Opportunities]',
  },
  openSupportCaseText: {
    id: 'helpPanel.feedback.openSupportCaseText',
    defaultMessage: 'open a support case',
  },
  shareMoreFeedback: {
    id: 'helpPanel.feedback.shareMoreFeedback',
    defaultMessage: 'Share more feedback',
  },
  breadcrumbShareFeedback: {
    id: 'helpPanel.feedback.breadcrumbShareFeedback',
    defaultMessage: 'Share feedback',
  },
});

export default messages;
