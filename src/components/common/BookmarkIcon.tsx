import React from 'react';
import { BookmarkIcon, OutlinedBookmarkIcon } from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';
import './BookmarkIcon.scss';

export const OutlinedBookmarkedIcon = ({
  className,
}: {
  className?: string;
}) => (
  <Icon isInline className={className}>
    <OutlinedBookmarkIcon color="var(--pf-t--global--icon--color--disabled)" />
  </Icon>
);

export const BookmarkedIcon = ({ className }: { className?: string }) => (
  <Icon isInline className={className}>
    <BookmarkIcon className="lr-c-bookmark__icon" />
  </Icon>
);
