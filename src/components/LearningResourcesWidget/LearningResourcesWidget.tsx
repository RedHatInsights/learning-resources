import React from 'react';
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
import { Flex, FlexItem } from '@patternfly/react-core';

import './LearningResourcesWidget.scss';

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

const LearningResourcesWidget: React.FunctionComponent = () => {
  const { bookmarks } = useQuickStarts('settings');

  const getPathName = (url: string) => {
    return new URL(url).host;
  };

  return (
    <div>
      {bookmarks.length === 0 ? (
        <LearningResourcesEmptyState />
      ) : (
        <Gallery className="widget-learning-resources pf-v5-u-p-md" hasGutter>
          {bookmarks.map(({ spec }, index) => (
            <div key={index}>
              <TextContent>
                <LinkWrapper
                  title={spec.displayName}
                  pathname={spec.link?.href || ''}
                />
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

export default LearningResourcesWidget;
