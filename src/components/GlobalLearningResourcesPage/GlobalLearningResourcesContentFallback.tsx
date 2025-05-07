import React from 'react';
import {
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Skeleton,
} from '@patternfly/react-core';
import './GlobalLearningResourcesFilters.scss';

export const GlobalLearningResourcesContentFallback = () => {
  const cardsCount = 40;
  const skeletonWidths = [
    '100%',
    '62%',
    '100%',
    '100%',
    '100%',
    '84%',
    '54%',
    '54%',
  ];

  return (
    <Gallery hasGutter className="pf-v6-u-m-lg">
      {Array.from({ length: cardsCount }).map((_, index) => (
        <GalleryItem key={index}>
          <Card>
            <CardBody>
              {skeletonWidths.map((width, skeletonIndex) => (
                <Skeleton
                  key={skeletonIndex}
                  width={width}
                  height="20px"
                  className="pf-v6-u-mb-sm"
                />
              ))}
            </CardBody>
          </Card>
        </GalleryItem>
      ))}
    </Gallery>
  );
};

export default GlobalLearningResourcesContentFallback;
