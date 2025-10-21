import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  PageSection,
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';

const CreatorYAMLView: React.FC = () => {
  return (
    <PageSection>
      <EmptyState
        variant="lg"
        icon={CodeIcon}
        titleText="Creator Mode (YAML)"
        headingLevel="h4"
      >
        <EmptyStateBody>
          The YAML editor will be implemented here.
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  );
};

export default CreatorYAMLView;
