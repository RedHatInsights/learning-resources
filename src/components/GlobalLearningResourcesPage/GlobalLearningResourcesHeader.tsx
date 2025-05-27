import React from 'react';
import './GlobalLearningResourcesHeader.scss';
import {
  Content,
  ContentVariants,
  Divider,
  Stack,
  StackItem,
} from '@patternfly/react-core';

export const GlobalLearningResourcesHeader = () => {
  return (
    <div className="lr-c-global-learning-resources-page__header">
      <img
        className="pf-v6-u-ml-lg pf-v6-u-mr-lg lr-c-global-learning-resources-page__header--image"
        width="48px"
        height="48px"
        src="/apps/frontend-assets/learning-resources/LearningResources.svg"
        alt="Learning resources icon"
      />
      <Divider
        className="pf-v6-u-pt-md pf-v6-u-pb-md"
        orientation={{
          default: 'vertical',
        }}
        inset={{
          default: 'insetSm',
        }}
      />
      <Stack className="pf-v6-u-m-lg">
        <StackItem>
          <Content component={ContentVariants.h1}>
            All learning resources
          </Content>
        </StackItem>
        <StackItem>
          <Content component={ContentVariants.p}>
            See learning resources for services and features across the Hybrid
            Cloud Console. Find additional resources on{' '}
            <Content
              component={ContentVariants.a}
              href="https://developers.redhat.com/learn"
              target="_blank"
              rel="noopener noreferrer"
            >
              developers.redhat.com
            </Content>
            ,{' '}
            <Content
              component={ContentVariants.a}
              href="https://cloud.redhat.com/learn"
              target="_blank"
              rel="noopener noreferrer"
            >
              cloud.redhat.com
            </Content>
            , and on{' '}
            <Content
              component={ContentVariants.a}
              href="https://www.redhat.com/en/resources"
              target="_blank"
              rel="noopener noreferrer"
            >
              redhat.com
            </Content>
            .
          </Content>
        </StackItem>
      </Stack>
    </div>
  );
};

export default GlobalLearningResourcesHeader;
