import React from 'react';
import { StarIcon } from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';

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
      color={
        !isFavorited ? 'var(--pf-t--global--icon--color--disabled)' : undefined
      }
    />
  </Icon>
);
