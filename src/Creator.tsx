import React, { PropsWithChildren, ReactNode, useMemo, useState } from 'react';
import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  PageGroup,
  PageSection,
  Radio,
  Title,
} from '@patternfly/react-core';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

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

type CommonItemState = {
  bundle: string;
  title: string;
  description: string;
};

type ItemFormProps = PropsWithChildren<{
  commonState: CommonItemState;
  onChangeCommonState: (newState: CommonItemState) => void;
}>;

const INVALID_BUNDLE = 'invalid-bundle';

const BundleInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (newValue: string) => void;
}) => {
  const { getAvailableBundles } = useChrome();
  const bundles = useMemo(() => getAvailableBundles(), []);

  return (
    <FormGroup label="Bundle">
      <FormSelect
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Bundle"
      >
        <FormSelectOption value={INVALID_BUNDLE} label="--chose one" />

        {...bundles.map((b) => (
          <FormSelectOption key={b.id} value={b.id} label={b.title} />
        ))}
      </FormSelect>
    </FormGroup>
  );
};

const ItemFormElement = ({ children }: { children: ReactNode }) => {
  return <GridItem span={6}>{children}</GridItem>;
};

const ItemForm = ({
  commonState,
  onChangeCommonState,
  children,
}: ItemFormProps) => {
  return (
    <Grid>
      <ItemFormElement>
        <BundleInput
          value={commonState.bundle}
          onChange={(newBundle) =>
            onChangeCommonState({ ...commonState, bundle: newBundle })
          }
        />
      </ItemFormElement>

      {children}
    </Grid>
  );
};

const Creator = () => {
  const [selectedType, setSelectedType] = useState<ItemKind | null>(null);

  const [commonState, setCommonState] = useState<CommonItemState>({
    bundle: INVALID_BUNDLE,
    title: '',
    description: '',
  });

  return (
    <PageGroup>
      <PageSection>
        <Title headingLevel="h1" size="2xl">
          Add new learning resources
        </Title>
        Description
      </PageSection>

      <PageSection>
        <h2>Content Type</h2>

        <FormGroup role="radiogroup">
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
        </FormGroup>
      </PageSection>

      <PageSection>
        <h2>Resource Details</h2>

        <ItemForm
          commonState={commonState}
          onChangeCommonState={(state) => setCommonState(state)}
        ></ItemForm>
      </PageSection>
    </PageGroup>
  );
};

export default Creator;
