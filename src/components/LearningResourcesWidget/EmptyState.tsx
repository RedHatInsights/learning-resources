import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core/';
import BookMarkEmptyState from './Bookmarks_empty-state.svg';

import './empty-state.scss';
import { useNavigate } from 'react-router-dom';
import { useFlag } from '@unleash/proxy-client-react';

const LearningResourcesEmptyState: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const enableGlobalLearningResourcesPage = useFlag(
    'platform.learning-resources.global-learning-resources'
  );
  return (
    <EmptyState
      variant={EmptyStateVariant.lg}
      title="No bookmarked learning resources"
      headingLevel="h4"
      icon={() => <img src={BookMarkEmptyState}></img>}
      className="pf-v6-u-py-md"
    >
      <EmptyStateBody>
        <Stack>
          <StackItem>
            Add documentation, quickstarts, learning paths, and more to your
            bookmarks for easy access in the future.
          </StackItem>
        </Stack>
      </EmptyStateBody>
      <EmptyStateFooter className="pf-v6-u-mt-sm">
        <Button
          variant="secondary"
          component="a"
          href={
            enableGlobalLearningResourcesPage
              ? '/learning-resources'
              : '/settings/learning-resources'
          }
          onClick={(e) => {
            e.preventDefault();
            navigate(
              enableGlobalLearningResourcesPage
                ? '/learning-resources'
                : '/settings/learning-resources'
            );
          }}
        >
          View all learning resources
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default LearningResourcesEmptyState;
