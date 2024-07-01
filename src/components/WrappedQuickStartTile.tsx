import React, { SyntheticEvent } from 'react';
import {
  QuickStart,
  QuickStartStatus,
  QuickStartTile,
} from '@patternfly/quickstarts';

import { BookmarkIcon, OutlinedBookmarkIcon } from '@patternfly/react-icons';
import { Icon } from '@patternfly/react-core';
import './WrappedQuickStartTile.scss';

const OutlinedBookmarkedIcon = () => (
  <Icon className="lr-c-bookmark__icon">
    <OutlinedBookmarkIcon />
  </Icon>
);

const BookmarkedIcon = () => (
  <Icon className="lr-c-bookmark__icon">
    <BookmarkIcon />
  </Icon>
);

type BookmarksConfig = {
  isFavorite: boolean;
  setFavorite: (newState: boolean) => Promise<void>;
} | null;

const WrappedQuickStartTile = ({
  quickStart,
  bookmarks,
  isActive,
  status,
}: {
  quickStart: QuickStart;
  bookmarks: BookmarksConfig;
  isActive: boolean;
  status: QuickStartStatus;
}) => {
  return (
    <div className="lr-c-quickstart_tile">
      <QuickStartTile
        action={
          bookmarks !== null
            ? {
                'aria-label': bookmarks.isFavorite
                  ? `Remove quickstart ${quickStart.spec.displayName} from bookmarks.`
                  : `Bookmark quickstart ${quickStart.spec.displayName}.`,
                icon: bookmarks.isFavorite
                  ? BookmarkedIcon
                  : OutlinedBookmarkedIcon,
                onClick: (e: SyntheticEvent<Element, Event>): void => {
                  e.preventDefault();
                  e.stopPropagation();
                  bookmarks.setFavorite(!bookmarks.isFavorite);
                },
              }
            : undefined
        }
        quickStart={{
          ...quickStart,
          spec: {
            ...quickStart.spec,
            // remove any lingering icons
            icon: null,
          },
        }}
        isActive={isActive}
        status={status}
      />
    </div>
  );
};

export default WrappedQuickStartTile;
