import React, { Fragment, useEffect, useState } from 'react';
import {
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core/dist/dynamic/components/Text';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { Link } from 'react-router-dom';
import { Gallery } from '@patternfly/react-core/dist/dynamic/layouts/Gallery';
import { Label } from '@patternfly/react-core/dist/dynamic/components/Label';
import LearningResourcesEmptyState from './EmptyState';
import useQuickStarts from '../../hooks/useQuickStarts';
import {
  Bullseye,
  Flex,
  FlexItem,
  Icon,
  Spinner,
} from '@patternfly/react-core';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/js/icons/external-link-alt-icon';

import './LearningResourcesWidget.scss';
import { QuickStart } from '@patternfly/quickstarts';

export const API_BASE = '/api/quickstarts/v1';
export const QUICKSTARTS = '/quickstarts';
export const FAVORITES = '/favorites';

export type FavoriteQuickStart = {
  favorite: boolean;
  quickstartName: string;
};

const LinkWrapper = ({
  pathname,
  title,
}: {
  pathname: string;
  title: string;
}) => {
  const { updateDocumentTitle } = useChrome();
  return (
    <Link onClick={() => updateDocumentTitle(title)} to={pathname}>
      {title}
    </Link>
  );
};

const LearningResourcesWidget: React.FunctionComponent<{
  bookmarks: QuickStart[];
}> = ({ bookmarks }) => {
  const getPathName = (url: string) => {
    return new URL(url).host;
  };

  return (
    <div className="learning-resources-widget">
      {bookmarks.length === 0 ? (
        <LearningResourcesEmptyState />
      ) : (
        <Gallery className="widget-learning-resources pf-v5-u-p-md" hasGutter>
          {bookmarks.map(({ spec, metadata }, index) => (
            <div key={index}>
              <TextContent>
                {metadata.externalDocumentation ? (
                  <a href={spec.link?.href} target="_blank" rel="noreferrer">
                    {spec.displayName}
                    <Icon className="pf-v5-u-ml-sm" isInline>
                      <ExternalLinkAltIcon />
                    </Icon>
                  </a>
                ) : (
                  <LinkWrapper
                    title={spec.displayName}
                    pathname={spec.link?.href || ''}
                  />
                )}
              </TextContent>
              <Flex direction={{ default: 'row' }}>
                <FlexItem className="pf-v5-u-mr-sm">
                  {spec.type && (
                    <Label color={spec.type.color}>{spec.type.text}</Label>
                  )}
                </FlexItem>
                <FlexItem>
                  <TextContent>
                    <Text component={TextVariants.small}>
                      {spec.link?.href ? getPathName(spec.link?.href) : ''}
                    </Text>
                  </TextContent>
                </FlexItem>
              </Flex>
            </div>
          ))}
        </Gallery>
      )}
    </div>
  );
};

const GetFavorites = ({
  onContentReady,
  bundle,
}: {
  bundle: string;
  onContentReady: (data: QuickStart[]) => void;
}) => {
  const { bookmarks, contentReady } = useQuickStarts(bundle);
  useEffect(() => {
    if (contentReady) {
      onContentReady(bookmarks);
    }
  }, [contentReady]);
  return null;
};

const LearningResourcesWidgetWrapper = () => {
  const { getAvailableBundles } = useChrome();
  const [allFavorites, setAllFavorites] = useState<QuickStart[][]>([]);
  return (
    <Fragment>
      {getAvailableBundles().map(({ id }, index) => (
        <GetFavorites
          bundle={id}
          key={index}
          onContentReady={(data) => setAllFavorites((prev) => [...prev, data])}
        />
      ))}
      {allFavorites.length !== getAvailableBundles().length ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <LearningResourcesWidget bookmarks={allFavorites.flat()} />
      )}
    </Fragment>
  );
};

export default LearningResourcesWidgetWrapper;
