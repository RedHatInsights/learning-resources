import React from 'react';
import { Skeleton, Stack, StackItem } from '@patternfly/react-core';
import './GlobalLearningResourcesFilters.scss';

const GlobalLearningResourcesFiltersFallback: React.FC = () => {
  const skeletonWidths = [
    '100%',
    '50%',
    '60%',
    '80%',
    '40%',
    '90%',
    '30%',
    '85%',
    '65%',
    '55%',
    '75%',
    '45%',
    '95%',
    '35%',
  ];

  return (
    <Stack
      hasGutter
      className="lr-c-global-learning-resources-page__filters pf-v6-u-p-lg"
    >
      {/* Dynamic StackItems */}
      {skeletonWidths.map((width, index) => (
        <StackItem
          key={index}
          className={`lr-c-global-learning-resources-page__filters--item-${
            index + 1
          }`}
        >
          <Skeleton height="100%" width={width} />
        </StackItem>
      ))}
    </Stack>
  );
};

export default GlobalLearningResourcesFiltersFallback;
