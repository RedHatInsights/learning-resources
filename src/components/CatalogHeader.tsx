import {
  Button,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import React, { useContext } from 'react';
import './CatalogHeader.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { AppContext } from '../AppContext';

const CatalogHeader = () => {
  // FIXME: Add missing type to the types lib
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { getBundleData } = useChrome();
  const { bundleTitle } = getBundleData();
  const { onNavigate } = useContext(AppContext);

  return (
    <Flex
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      alignItems={{ default: 'alignItemsCenter' }}
    >
      <FlexItem grow={{ default: 'grow' }}>
        <Stack className="lr-c-catalog__header">
          <StackItem>
            <Title
              className="lr-c-catalog__header-bundle"
              headingLevel="h2"
              size="lg"
            >
              {bundleTitle}
            </Title>
          </StackItem>
          <StackItem>
            <Title headingLevel="h1" size="2xl">
              Learning Resources
            </Title>
          </StackItem>
        </Stack>
      </FlexItem>

      {onNavigate !== undefined ? (
        <FlexItem>
          <Button variant="secondary" onClick={() => onNavigate('creator')}>
            Creator
          </Button>
        </FlexItem>
      ) : null}
    </Flex>
  );
};

export default CatalogHeader;
