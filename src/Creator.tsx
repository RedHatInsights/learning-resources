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
  TextArea,
  TextInput,
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

type StringInputProps = {
  value: string;
  onChange: (newValue: string) => void;
};

const BundleInput = ({ value, onChange }: StringInputProps) => {
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

const TitleInput = ({ value, onChange }: StringInputProps) => {
  return (
    <FormGroup label="Title">
      <TextInput
        isRequired
        type="text"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource title"
      ></TextInput>
    </FormGroup>
  );
};

const DescriptionInput = ({ value, onChange }: StringInputProps) => {
  return (
    <FormGroup label="Description">
      <TextArea
        isRequired
        type="text"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource title"
        rows={3}
        resizeOrientation="vertical"
      ></TextArea>
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
  const commonInputs: [
    keyof CommonItemState,
    (props: StringInputProps) => ReactNode
  ][] = [
    ['bundle', BundleInput],
    ['title', TitleInput],
    ['description', DescriptionInput],
  ];

  return (
    <Grid>
      {...commonInputs.map(([key, ComponentType]) => (
        <ItemFormElement key={key}>
          <ComponentType
            value={commonState[key]}
            onChange={(newValue) =>
              onChangeCommonState({ ...commonState, [key]: newValue })
            }
          />
        </ItemFormElement>
      ))}

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
