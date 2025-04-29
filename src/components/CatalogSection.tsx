import {
  Badge,
  Button,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import React, { PropsWithChildren, useState } from 'react';
import { AngleRightIcon } from '@patternfly/react-icons';

import './CatalogSection.scss';
import { FilterMap } from '../utils/filtersInterface';
import GlobalLearningResourcesQuickstartItem from './GlobalLearningResourcesPage/GlobalLearningResourcesQuickstartItem';
import findQuickstartFilterTags from '../utils/findQuickstartFilterTags';
import { ExtendedQuickstart } from '../utils/fetchQuickstarts';

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
              <Badge className="pf-v6-u-ml-sm">{sectionCount}</Badge>
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
              <Badge isRead={!sectionCount} className="pf-v6-u-ml-sm">
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
  rightTitle,
  emptyBody,
  sectionName,
  filterMap,
  purgeCache,
}: PropsWithChildren<{
  sectionTitle: React.ReactNode;
  sectionCount: number;
  sectionQuickStarts: ExtendedQuickstart[];
  emptyBody?: React.ReactNode;
  rightTitle?: React.ReactNode;
  sectionDescription?: React.ReactNode;
  isExpandable?: boolean;
  sectionName: string;
  filterMap: FilterMap;
  purgeCache: () => void;
}>) => {
  // Expandable section does not support disabled sections
  if (sectionCount === 0 && isExpandable) {
    return (
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        id={sectionName}
        className="lr-c-catalog-section"
      >
        <FlexItem className="pf-v6-u-mr-sm">
          <Button
            className="pf-v6-c-expandable-section__toggle pf-v6-u-pl-0 pf-v6-u-pr-0"
            variant="plain"
            isDisabled
            icon={<AngleRightIcon />}
          ></Button>
        </FlexItem>
        <FlexItem>
          <SplitItem isFilled>
            <Title headingLevel="h3" size="lg">
              {sectionTitle}
              <Badge isRead={false} className="pf-v6-u-ml-sm">
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
        <Content className="pf-v6-u-mb-md">
          <Content component="p">{sectionDescription}</Content>
        </Content>
      )}
      {sectionCount ? (
        <Gallery hasGutter>
          {sectionQuickStarts.map((quickStart) => {
            const quickStartTags = findQuickstartFilterTags(
              filterMap,
              quickStart
            );
            return (
              <GalleryItem key={quickStart.metadata.name}>
                <GlobalLearningResourcesQuickstartItem
                  purgeCache={purgeCache}
                  quickStart={quickStart}
                  quickStartTags={quickStartTags}
                />
              </GalleryItem>
            );
          })}
        </Gallery>
      ) : (
        emptyBody
      )}
    </CatalogWrapper>
  );
};

export default CatalogSection;
