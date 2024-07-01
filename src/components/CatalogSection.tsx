import {
  AllQuickStartStates,
  QuickStart,
  getQuickStartStatus,
} from '@patternfly/quickstarts';
import {
  Badge,
  Button,
  ExpandableSection,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Split,
  SplitItem,
  Text,
  TextContent,
  Title,
} from '@patternfly/react-core';
import React, { PropsWithChildren, useState } from 'react';
import { AngleRightIcon } from '@patternfly/react-icons';
import { useFlag } from '@unleash/proxy-client-react';

import './CatalogSection.scss';
import WrappedQuickStartTile from './WrappedQuickStartTile';

const CatalogWrapper: React.FC<
  PropsWithChildren<{
    sectionCount: number;
    sectionTitle: React.ReactNode;
    children: React.ReactNode;
    isExpandable?: boolean;
    rightTitle?: React.ReactNode;
    sectionName: string;
  }>
> = ({
  children,
  sectionTitle,
  sectionCount,
  isExpandable = true,
  rightTitle,
  sectionName,
}) => {
  const [isExpanded, setIsExpanded] = useState(!!sectionCount);

  if (!isExpandable) {
    return (
      <div className="lr-c-catalog-section" id={sectionName}>
        <Split>
          <SplitItem isFilled>
            <Title headingLevel="h3" size="lg">
              {sectionTitle}
              <Badge className="pf-u-ml-sm">{sectionCount}</Badge>
            </Title>
          </SplitItem>
          <SplitItem>{rightTitle}</SplitItem>
        </Split>
        {children ? (
          <div className="lr-c-catalog-section__static">{children}</div>
        ) : null}
      </div>
    );
  }

  return (
    <ExpandableSection
      isExpanded={isExpanded}
      isIndented
      onToggle={() => setIsExpanded((prev) => !prev)}
      className="lr-c-catalog-section"
      id={sectionName}
      toggleContent={
        <Split>
          <SplitItem isFilled>
            <Title headingLevel="h3" size="lg">
              {sectionTitle}
              <Badge isRead={!sectionCount} className="pf-u-ml-sm">
                {sectionCount}
              </Badge>
            </Title>
          </SplitItem>
          <SplitItem>{rightTitle}</SplitItem>
        </Split>
      }
    >
      {children}
    </ExpandableSection>
  );
};

const CatalogSection = ({
  sectionTitle,
  sectionDescription,
  sectionCount,
  sectionQuickStarts,
  isExpandable = true,
  activeQuickStartID,
  allQuickStartStates,
  rightTitle,
  emptyBody,
  toggleFavorite,
  sectionName,
}: PropsWithChildren<{
  sectionTitle: React.ReactNode;
  sectionCount: number;
  sectionQuickStarts: QuickStart[];
  emptyBody?: React.ReactNode;
  rightTitle?: React.ReactNode;
  sectionDescription?: React.ReactNode;
  isExpandable?: boolean;
  activeQuickStartID?: string;
  allQuickStartStates?: AllQuickStartStates;
  sectionName: string;
  toggleFavorite: (name: string, favorite: boolean) => Promise<void>;
}>) => {
  const showBookmarks = useFlag('platform.learning-resources.bookmarks');
  // Expandable section does not support disabled sections
  if (sectionCount === 0 && isExpandable) {
    return (
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        id={sectionName}
        className="lr-c-catalog-section"
      >
        <FlexItem className="pf-v5-u-mr-sm">
          <Button
            className="pf-c-expandable-section__toggle pf-v5-u-pl-0 pf-v5-u-pr-0"
            variant="plain"
            isDisabled
            icon={<AngleRightIcon />}
          ></Button>
        </FlexItem>
        <FlexItem>
          <SplitItem isFilled>
            <Title headingLevel="h3" size="lg">
              {sectionTitle}
              <Badge isRead={false} className="pf-u-ml-sm">
                {sectionCount}
              </Badge>
            </Title>
          </SplitItem>
          <SplitItem>{rightTitle}</SplitItem>
        </FlexItem>
      </Flex>
    );
  }

  return (
    <CatalogWrapper
      sectionName={sectionName}
      sectionCount={sectionCount}
      sectionTitle={sectionTitle}
      isExpandable={isExpandable}
      rightTitle={rightTitle}
    >
      {sectionDescription && (
        <TextContent className="pf-u-mb-md">
          <Text>{sectionDescription}</Text>
        </TextContent>
      )}
      {sectionCount ? (
        <Gallery hasGutter>
          {sectionQuickStarts.map((quickStart) => (
            <GalleryItem key={quickStart.metadata.name}>
              <WrappedQuickStartTile
                quickStart={quickStart}
                bookmarks={
                  showBookmarks
                    ? {
                        isFavorite: quickStart.metadata.favorite,
                        setFavorite: (newState) =>
                          toggleFavorite(quickStart.metadata.name, newState),
                      }
                    : null
                }
                isActive={quickStart.metadata.name === activeQuickStartID}
                status={getQuickStartStatus(
                  allQuickStartStates || {},
                  quickStart.metadata.name
                )}
              />
            </GalleryItem>
          ))}
        </Gallery>
      ) : (
        emptyBody
      )}
    </CatalogWrapper>
  );
};

export default CatalogSection;
