import React, { Suspense } from 'react';
import {
  Content,
  ContentVariants,
} from '@patternfly/react-core/dist/dynamic/components/Content';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { Link } from 'react-router-dom';
import { Label } from '@patternfly/react-core/dist/dynamic/components/Label';
import LearningResourcesEmptyState from './EmptyState';
import {
  Bullseye,
  Flex,
  FlexItem,
  Icon,
  Spinner,
} from '@patternfly/react-core';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/js/icons/external-link-alt-icon';

import './LearningResourcesWidget.scss';
import { ObjectMetadata } from '@patternfly/quickstarts/dist/ConsoleInternal/module/k8s/types';
import {
  UnwrappedLoader,
  suspenseLoader as useSuspenseLoader,
} from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader';
import fetchAllData from '../../utils/fetchAllData';
import useQuickStarts from '../../hooks/useQuickStarts';

export const API_BASE = '/api/quickstarts/v1';
export const QUICKSTARTS = '/quickstarts';
export const FAVORITES = '/favorites';

export type FavoriteQuickStart = {
  favorite: boolean;
  quickstartName: string;
};

const constructQuickStartUrl: (metadata: ObjectMetadata) => string = ({
  tags,
}) => {
  const bunlde = tags.find(({ kind }: { kind: string }) => kind === 'bundle');
  const application = tags.find(
    ({ kind }: { kind: string }) => kind === 'application'
  );
  return `${bunlde ? `/${bunlde.value}` : ''}${
    application ? `/${application.value}` : ''
  }`;
};

const LearningResourcesWidget: React.FunctionComponent<{
  loader: UnwrappedLoader<typeof fetchAllData>;
}> = ({ loader }) => {
  const { auth, quickStarts } = useChrome();

  const [, quickstartsData] = loader(auth.getUser);
  const { bookmarks } = useQuickStarts(quickstartsData);
  const getPathName = (url: string) => {
    return new URL(url).host;
  };

  return (
    <div className="learning-resources-widget">
      {bookmarks.length === 0 ? (
        <LearningResourcesEmptyState />
      ) : (
        <Flex direction={{ default: 'column' }}>
          {bookmarks.map(({ spec, metadata }, index) => (
            <Flex key={index} className="lrn-widg-l-flex-row">
              <FlexItem className="item-1">
                <Content>
                  {metadata.tags.find(
                    ({ kind }: { kind: string }) => kind === 'content'
                  )?.value === 'quickstart' ? (
                    <Link
                      onClick={() =>
                        quickStarts.activateQuickstart(metadata.name)
                      }
                      to={spec.link?.href || constructQuickStartUrl(metadata)}
                    >
                      {spec.displayName}
                    </Link>
                  ) : (
                    <a href={spec.link?.href} target="_blank" rel="noreferrer">
                      {spec.displayName}
                      <Icon className="pf-v6-u-ml-sm" size="sm" isInline>
                        <ExternalLinkAltIcon />
                      </Icon>
                    </a>
                  )}
                </Content>
              </FlexItem>
              <Flex className="group">
                <FlexItem className="item-2">
                  {spec.type && (
                    <Label color={spec.type.color} isCompact>
                      {spec.type.text}
                    </Label>
                  )}
                </FlexItem>
                <FlexItem className="item-3">
                  <Content>
                    <Content component={ContentVariants.small}>
                      {spec.link?.href ? getPathName(spec.link?.href) : ''}
                    </Content>
                  </Content>
                </FlexItem>
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </div>
  );
};

const LearningResourcesWidgetWrapper = () => {
  const { loader } = useSuspenseLoader(fetchAllData);
  return (
    <Suspense
      fallback={
        <Bullseye className="lrn-widg-l-loader">
          <Spinner />
        </Bullseye>
      }
    >
      <LearningResourcesWidget loader={loader} />
    </Suspense>
  );
};

export default LearningResourcesWidgetWrapper;
