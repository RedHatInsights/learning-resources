import React from 'react';
import { StarIcon } from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';
import './FavoriteIcon.scss';

export const FavoriteIcon = ({
  isFavorited,
  className,
}: {
  isFavorited: boolean;
  className?: string;
}) => (
  <Icon
    isInline
    className={className}
    status={isFavorited ? 'warning' : undefined}
  >
    <StarIcon
      className={!isFavorited ? 'lr-c-favorite__icon--unfavorited' : undefined}
    />
  </Icon>
);
