import React, { ReactNode, useMemo, useState } from 'react';
import {
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  NumberInput,
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

type CommonItemFormProps = {
  commonState: CommonItemState;
  onChangeCommonState: (newState: CommonItemState) => void;
};

type DocumentationState = {
  url: string;
};

type QuickstartState = {
  duration: number;
};

type DocumentationFormProps = {
  documentationState: DocumentationState;
  onChangeDocumentationState: (newState: DocumentationState) => void;
};

type QuickstartFormProps = {
  quickstartState: QuickstartState;
  onChangeQuickstartState: (newState: QuickstartState) => void;
};

const INVALID_BUNDLE = 'invalid-bundle';

type InputProps<T> = {
  value: T;
  onChange: (newValue: T) => void;
};

type StringInputProps = InputProps<string>;

const TypeInput = ({ value, onChange }: InputProps<ItemKind | null>) => {
  return (
    <FormGroup label="Select content type" isRequired>
      <FormGroup role="radiogroup" aria-label="Select content type">
        {Object.entries(itemKindMeta).map(([rawName, meta]) => {
          const name = rawName as keyof typeof itemKindMeta;

          return (
            <Radio
              key={name}
              id={`cr-input-type-${name}`}
              name={`cr-input-type`}
              isChecked={value === name}
              onChange={(_, isChecked) => {
                if (isChecked) {
                  onChange(name);
                } else if (value === name) {
                  onChange(null);
                }
              }}
              label={meta.label}
            ></Radio>
          );
        })}
      </FormGroup>
    </FormGroup>
  );
};

const BundleInput = ({ value, onChange }: StringInputProps) => {
  const { getAvailableBundles } = useChrome();
  const bundles = useMemo(() => getAvailableBundles(), []);

  return (
    <FormGroup label="Bundle" isRequired>
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
    <FormGroup label="Title" isRequired>
      <TextInput
        isRequired
        type="text"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource title"
        placeholder="Title to display on card"
      ></TextInput>
    </FormGroup>
  );
};

const DescriptionInput = ({ value, onChange }: StringInputProps) => {
  return (
    <FormGroup label="Description" isRequired>
      <TextArea
        isRequired
        type="text"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource title"
        placeholder="Short description of resource and will auto-truncate with '...' after 3 lines"
        rows={3}
        resizeOrientation="vertical"
      ></TextArea>
    </FormGroup>
  );
};

const UrlInput = ({ value, onChange }: StringInputProps) => {
  return (
    <FormGroup label="Resource URL" isRequired>
      <TextInput
        isRequired
        type="url"
        value={value}
        onChange={(_, value) => onChange(value)}
        aria-label="Resource URL"
        placeholder="https://url.redhat.com/docs-n-things"
      ></TextInput>
    </FormGroup>
  );
};

const DurationInput = ({ value, onChange }: InputProps<number>) => {
  return (
    <FormGroup label="Approximate completion time" isRequired>
      <NumberInput
        type="number"
        value={value}
        unit="minutes"
        onChange={(event) => onChange(parseInt(event.currentTarget.value, 10))}
        onPlus={() => onChange(value + 1)}
        onMinus={() => onChange(value - 1)}
        inputAriaLabel="Approximate completion time"
        minusBtnAriaLabel="Decrease approximate completion time"
        plusBtnAriaLabel="Increase approximate completion time"
      />
    </FormGroup>
  );
};

const ItemFormElement = ({ children }: { children: ReactNode }) => {
  return <GridItem span={6}>{children}</GridItem>;
};

const ItemFormContainer = ({ children }: { children: ReactNode }) => {
  return <Grid>{children}</Grid>;
};

const CommonItemForm = ({
  commonState,
  onChangeCommonState,
}: CommonItemFormProps) => {
  const commonInputs: [
    keyof CommonItemState,
    (props: StringInputProps) => ReactNode
  ][] = [
    ['bundle', BundleInput],
    ['title', TitleInput],
    ['description', DescriptionInput],
  ];

  return (
    <>
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
    </>
  );
};

const DocumentationForm = ({
  documentationState,
  onChangeDocumentationState,
}: DocumentationFormProps) => {
  return (
    <>
      <ItemFormElement>
        <UrlInput
          value={documentationState.url}
          onChange={(newUrl) =>
            onChangeDocumentationState({ ...documentationState, url: newUrl })
          }
        />
      </ItemFormElement>
    </>
  );
};

const QuickstartForm = ({
  quickstartState,
  onChangeQuickstartState,
}: QuickstartFormProps) => {
  return (
    <>
      <ItemFormElement>
        <DurationInput
          value={quickstartState.duration}
          onChange={(newDuration) =>
            onChangeQuickstartState({
              ...quickstartState,
              duration: newDuration,
            })
          }
        />
      </ItemFormElement>
    </>
  );
};

const Creator = () => {
  const [selectedType, setSelectedType] = useState<ItemKind | null>(null);

  const [commonState, setCommonState] = useState<CommonItemState>({
    bundle: INVALID_BUNDLE,
    title: '',
    description: '',
  });

  const [documentationState, setDocumentationState] =
    useState<DocumentationState>({
      url: '',
    });

  const [quickstartState, setQuickstartState] = useState<QuickstartState>({
    duration: 0,
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

        <TypeInput
          value={selectedType}
          onChange={(newType) => setSelectedType(newType)}
        />
      </PageSection>

      <PageSection>
        <h2>Resource Details</h2>

        <ItemFormContainer>
          <CommonItemForm
            commonState={commonState}
            onChangeCommonState={(state) => setCommonState(state)}
          />

          {selectedType !== null
            ? {
                documentation: (
                  <DocumentationForm
                    documentationState={documentationState}
                    onChangeDocumentationState={(newState) =>
                      setDocumentationState(newState)
                    }
                  />
                ),
                quickstart: (
                  <QuickstartForm
                    quickstartState={quickstartState}
                    onChangeQuickstartState={(newState) =>
                      setQuickstartState(newState)
                    }
                  />
                ),
              }[selectedType]
            : null}
        </ItemFormContainer>
      </PageSection>
    </PageGroup>
  );
};

export default Creator;
