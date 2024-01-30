import {
  AllQuickStartStates,
  QuickStart,
  QuickStartTile,
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
  Text,
  TextContent,
  Title,
} from '@patternfly/react-core';
import React, { PropsWithChildren, useState } from 'react';
import { AngleRightIcon } from '@patternfly/react-icons';

import './CatalogSection.scss';

const CatalogSection = ({
  sectionTitle,
  sectionDescription,
  sectionCount,
  sectionQuickStarts,
  activeQuickStartID,
  allQuickStartStates,
}: PropsWithChildren<{
  sectionTitle: React.ReactNode;
  sectionDescription: React.ReactNode;
  sectionCount: number;
  sectionQuickStarts: QuickStart[];
  activeQuickStartID?: string;
  allQuickStartStates?: AllQuickStartStates;
}>) => {
  const [isExpanded, setIsExpanded] = useState(!!sectionCount);

  // Expandable section does not support disabled sections
  if (sectionCount === 0) {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Button
            className="pf-c-expandable-section__toggle"
            variant="plain"
            isDisabled
            icon={<AngleRightIcon />}
          ></Button>
        </FlexItem>
        <FlexItem>
          <Title headingLevel="h3" size="lg">
            {sectionTitle}
            <Badge className="pf-u-ml-sm">{sectionCount}</Badge>
          </Title>
        </FlexItem>
      </Flex>
    );
  }
  return (
    <ExpandableSection
      isExpanded={isExpanded}
      isIndented
      onToggle={() => setIsExpanded((prev) => !prev)}
      className="lr-c-catalog-section"
      toggleContent={
        <Title headingLevel="h3" size="lg">
          {sectionTitle}
          <Badge isRead={!sectionCount} className="pf-u-ml-sm">
            {sectionCount}
          </Badge>
        </Title>
      }
    >
      <TextContent className="pf-u-mb-md">
        <Text>{sectionDescription}</Text>
      </TextContent>
      <Gallery hasGutter>
        {sectionQuickStarts.map((quickStart) => (
          <GalleryItem
            className="pfext-quick-start-catalog__gallery-item"
            key={quickStart.metadata.name}
          >
            <QuickStartTile
              quickStart={{
                ...quickStart,
                spec: {
                  ...quickStart.spec,
                  // remove any lingering icons
                  icon: null,
                },
              }}
              isActive={quickStart.metadata.name === activeQuickStartID}
              status={getQuickStartStatus(
                allQuickStartStates || {},
                quickStart.metadata.name
              )}
            />
          </GalleryItem>
        ))}
      </Gallery>
    </ExpandableSection>
  );
};

export default CatalogSection;
