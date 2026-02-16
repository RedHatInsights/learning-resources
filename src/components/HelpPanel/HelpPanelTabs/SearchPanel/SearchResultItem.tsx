import React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  AngleRightIcon,
  BookOpenIcon,
  CloudIcon,
  ExternalLinkAltIcon,
  HeadsetIcon,
  LightbulbIcon,
  VectorSquareIcon,
} from '@patternfly/react-icons';
import { useIntl } from 'react-intl';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { getBundleDisplayName } from '../../../../utils/bundleUtils';
import messages from '../../../../Messages';

// Search result types
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  url?: string;
  type: 'documentation' | 'quickstart' | 'api' | 'support' | 'kb' | 'service';
  tags?: string[];
  relevanceScore?: number;
  bundleTags?: string[];
}

// Search Result Item Component
const SearchResultItem: React.FC<{
  result: SearchResult;
}> = ({ result }) => {
  const intl = useIntl();
  const chrome = useChrome();

  const handleResultClick = () => {
    if (result.type === 'quickstart' && result.id.startsWith('lr-')) {
      const resourceName = result.id.replace('lr-', '');
      chrome.quickStarts.activateQuickstart(resourceName);
    } else if (result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderBreadcrumb = () => {
    const getBreadcrumbConfig = (type: SearchResult['type']) => {
      switch (type) {
        case 'documentation':
          return {
            tabType: intl.formatMessage(messages.breadcrumbLearn),
            sectionTitle: intl.formatMessage(messages.contentTypeDocumentation),
            icon: <BookOpenIcon />,
          };
        case 'quickstart':
          return {
            tabType: null,
            sectionTitle: intl.formatMessage(messages.contentTypeQuickstarts),
            icon: null,
          };
        case 'api':
          return {
            tabType: intl.formatMessage(messages.breadcrumbApis),
            sectionTitle: intl.formatMessage(
              messages.breadcrumbApiDocumentation
            ),
            icon: <VectorSquareIcon />,
          };
        case 'kb':
          return {
            tabType: intl.formatMessage(messages.breadcrumbKnowledgeBase),
            sectionTitle: intl.formatMessage(
              messages.breadcrumbKnowledgeBaseArticles
            ),
            icon: <LightbulbIcon />,
          };
        case 'support':
          return {
            tabType: intl.formatMessage(messages.breadcrumbSupport),
            sectionTitle: intl.formatMessage(messages.breadcrumbSupportTickets),
            icon: <HeadsetIcon />,
          };
        case 'service':
          return {
            tabType: null,
            sectionTitle: intl.formatMessage(
              messages.breadcrumbHybridCloudService
            ),
            icon: <CloudIcon className="pf-v6-u-color-blue-400" />,
          };
        default:
          return { tabType: null, sectionTitle: type, icon: null };
      }
    };

    const config = getBreadcrumbConfig(result.type);

    return (
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsXs' }}
      >
        {config.icon && (
          <FlexItem>
            <span className="pf-v6-u-font-size-sm pf-v6-u-color-200">
              {config.icon}
            </span>
          </FlexItem>
        )}
        {config.tabType && (
          <>
            <FlexItem>
              <Content component="small" className="pf-v6-u-color-200">
                {config.tabType}
              </Content>
            </FlexItem>
            <FlexItem>
              <AngleRightIcon className="pf-v6-u-font-size-sm pf-v6-u-color-200" />
            </FlexItem>
          </>
        )}
        <FlexItem>
          <Content component="small" className="pf-v6-u-color-200">
            {config.sectionTitle}
          </Content>
        </FlexItem>
      </Flex>
    );
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Button
          variant="link"
          onClick={handleResultClick}
          isInline
          className="pf-v6-u-text-align-left pf-v6-u-p-0"
        >
          {result.title}
          {result.url && result.type !== 'quickstart' && (
            <ExternalLinkAltIcon className="pf-v6-u-ml-xs" />
          )}
        </Button>
      </StackItem>

      <StackItem>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>{renderBreadcrumb()}</FlexItem>
          {result.bundleTags && result.bundleTags.length > 0 && (
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                {result.bundleTags.map((tag, index: number) => {
                  const displayName = getBundleDisplayName(tag, {
                    allowFallback: false,
                  });
                  if (!displayName) return null; // Hide unknown bundle tags

                  return (
                    <FlexItem key={index}>
                      <Label color="grey" variant="filled" isCompact>
                        {displayName}
                      </Label>
                    </FlexItem>
                  );
                })}
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </StackItem>
    </Stack>
  );
};

export default SearchResultItem;
