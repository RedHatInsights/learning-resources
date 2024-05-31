import React, { useState } from 'react';
import { PageGroup, PageSection, Radio, Title } from '@patternfly/react-core';

type ItemKind = 'documentation' | 'quickstart';

type ItemKindMeta = {
  label: string;
};

const itemKindMeta: Record<ItemKind, ItemKindMeta> = {
  documentation: {
    label: 'Documentation',
  },
  quickstart: {
    label: 'Quickstart',
  },
};

const Creator = () => {
  const [selectedType, setSelectedType] = useState<ItemKind | null>(null);

  return (
    <PageGroup>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Add new learning resources
        </Title>
        Description
      </PageSection>

      <PageSection>
        <div>
          <h2>Content Type</h2>
          {Object.entries(itemKindMeta).map(([rawName, value]) => {
            const name = rawName as keyof typeof itemKindMeta;

            return (
              <Radio
                key={name}
                id={`cr-input-type-${name}`}
                name={`cr-input-type`}
                isChecked={name === selectedType}
                onChange={(_, isChecked) =>
                  setSelectedType((old) => {
                    if (isChecked) {
                      return name;
                    } else {
                      return old === name ? null : old;
                    }
                  })
                }
                label={value.label}
              ></Radio>
            );
          })}
        </div>
      </PageSection>
    </PageGroup>
  );
};

export default Creator;
