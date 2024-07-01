import { Stack, StackItem, Title } from '@patternfly/react-core';
import React from 'react';
import './CatalogHeader.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';

const CatalogHeader = () => {
  // FIXME: Add missing type to the types lib
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { getBundleData } = useChrome();
  const { bundleTitle } = getBundleData();
  return (
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
  );
};

export default CatalogHeader;
