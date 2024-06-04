import React, { ReactNode, useEffect, useMemo, useState } from 'react';
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
  Stack,
  StackItem,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import './Creator.scss';
import './components/CatalogSection.scss';
import {
  AllQuickStartStates,
  QuickStart,
  QuickStartContext,
  QuickStartDrawer,
  QuickStartStatus,
  QuickStartType,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import WrappedQuickStartTile from './components/WrappedQuickStartTile';

const rawItemKindMeta = {
  documentation: {
    displayName: 'Documentation',
    tagColor: 'orange',
    fields: {
      url: true,
    },
  },
  quickstart: {
    displayName: 'Quickstart',
    tagColor: 'green',
    hasDuration: true,
    fields: {
      duration: true,
    },
    hasTasks: true,
  },
  learningPath: {
    displayName: 'Learning path',
    tagColor: 'cyan',
    fields: {
      url: true,
    },
  },
  other: {
    displayName: 'Other',
    tagColor: 'purple',
    fields: {
      url: true,
    },
  },
} as const;

type ItemMeta = {
  displayName: string;
  tagColor: QuickStartType['color'];
  fields: {
    url?: boolean;
    duration?: boolean;
  };
  hasTasks?: boolean;
};

const itemKindMeta: {
  [k in keyof typeof rawItemKindMeta]: ItemMeta;
} = rawItemKindMeta;

type ItemKind = keyof typeof itemKindMeta;

type CommonItemState = {
  bundle: string;
  title: string;
  description: string;
};

const INVALID_BUNDLE = 'invalid-bundle';

type InputProps<T> = {
  value: T;
  onChange: (newValue: T) => void;
};

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
              label={meta.displayName}
            ></Radio>
          );
        })}
      </FormGroup>
    </FormGroup>
  );
};

const BundleInput = ({ value, onChange }: InputProps<string>) => {
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

const TitleInput = ({ value, onChange }: InputProps<string>) => {
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

const DescriptionInput = ({ value, onChange }: InputProps<string>) => {
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

const UrlInput = ({ value, onChange }: InputProps<string>) => {
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
        onChange={(event) =>
          onChange(Math.max(0, parseInt(event.currentTarget.value, 10)))
        }
        onPlus={() => onChange(Math.max(0, value + 1))}
        onMinus={() => onChange(Math.max(0, value - 1))}
        inputAriaLabel="Approximate completion time"
        minusBtnAriaLabel="Decrease approximate completion time"
        plusBtnAriaLabel="Increase approximate completion time"
        min={0}
      />
    </FormGroup>
  );
};

const ItemFormElement = ({ children }: { children: ReactNode }) => {
  return <GridItem span={6}>{children}</GridItem>;
};

const ItemFormContainer = ({ children }: { children: ReactNode }) => {
  return <Grid hasGutter>{children}</Grid>;
};

const CommonItemForm = ({ value, onChange }: InputProps<CommonItemState>) => {
  const commonInputs: [
    keyof CommonItemState,
    (props: InputProps<string>) => ReactNode
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
            value={value[key]}
            onChange={(newValue) => onChange({ ...value, [key]: newValue })}
          />
        </ItemFormElement>
      ))}
    </>
  );
};

const StepHeader = ({
  stepNumber,
  label,
}: {
  stepNumber: string;
  label: string;
}) => {
  return (
    <Title headingLevel="h2" size="xl" className="rc-step-header">
      <span className="rc-step-index" aria-label={`Step ${stepNumber}: `}>
        {stepNumber}
      </span>{' '}
      {label}
    </Title>
  );
};

const Creator = () => {
  const [selectedType, setSelectedType] = useState<ItemKind | null>(null);
  const typeMeta = selectedType !== null ? itemKindMeta[selectedType] : null;

  const [commonState, setCommonState] = useState<CommonItemState>({
    bundle: INVALID_BUNDLE,
    title: '',
    description: '',
  });

  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentDuration, setCurrentDuration] = useState<number>(0);

  const quickStart = useMemo<QuickStart>(
    () => ({
      metadata: {
        name: 'test-quickstart',
        kind: 'QuickStarts',
      },
      spec: {
        displayName: commonState.title,
        icon: null,
        description: commonState.description,
        introduction: 'Hi. *Really.* **Hello.**',
        link:
          typeMeta?.fields?.url === true
            ? {
                href: currentUrl,
                text: 'View documentation',
              }
            : undefined,
        type:
          typeMeta !== null
            ? {
                text: typeMeta.displayName,
                color: typeMeta.tagColor,
              }
            : undefined,
        durationMinutes:
          typeMeta?.fields?.duration === true && currentDuration > 0
            ? currentDuration
            : undefined,
        tasks:
          typeMeta?.hasTasks === true
            ? [
                {
                  title: 'This is a step',
                  description: 'Do the thing',
                  review: {
                    instructions: 'Verify you did the thing',
                    failedTaskHelp: 'Do it again.',
                  },
                },
              ]
            : undefined,
      },
    }),
    [commonState, typeMeta, currentUrl, currentDuration]
  );

  const allQuickStarts = useMemo(() => [quickStart], [quickStart]);
  const [activeQuickStart, setActiveQuickStart] = useState('');
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  const quickstartValues = useValuesForQuickStartContext({
    allQuickStarts: allQuickStarts,
    activeQuickStartID: activeQuickStart,
    setActiveQuickStartID: (id) => setActiveQuickStart(id),
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: (states) => setQuickStartStates(states),
    useQueryParams: false,
  });

  useEffect(() => {
    quickstartValues.setAllQuickStarts?.(allQuickStarts);
  }, [allQuickStarts]);

  return (
    <PageGroup>
      <PageSection variant="darker">
        <Title headingLevel="h1" size="2xl">
          Add new learning resources
        </Title>

        <p>Description</p>
      </PageSection>

      <PageSection isFilled>
        <Grid hasGutter className="pf-v5-u-h-100 pf-v5-u-w-100">
          <GridItem span={12} lg={6}>
            <Stack hasGutter>
              <StackItem>
                <section>
                  <StepHeader stepNumber="1" label="Content type" />

                  <TypeInput
                    value={selectedType}
                    onChange={(newType) => setSelectedType(newType)}
                  />
                </section>
              </StackItem>

              <StackItem>
                <section>
                  <StepHeader stepNumber="2" label="Resource details" />

                  <ItemFormContainer>
                    <CommonItemForm
                      value={commonState}
                      onChange={(state) => setCommonState(state)}
                    />

                    {typeMeta?.fields?.url === true ? (
                      <ItemFormElement>
                        <UrlInput
                          value={currentUrl}
                          onChange={(newUrl) => setCurrentUrl(newUrl)}
                        />
                      </ItemFormElement>
                    ) : null}

                    {typeMeta?.fields?.duration === true ? (
                      <ItemFormElement>
                        <DurationInput
                          value={currentDuration}
                          onChange={(newDuration) =>
                            setCurrentDuration(newDuration)
                          }
                        />
                      </ItemFormElement>
                    ) : null}
                  </ItemFormContainer>
                </section>
              </StackItem>
            </Stack>
          </GridItem>

          <GridItem span={12} lg={6}>
            <QuickStartContext.Provider value={quickstartValues}>
              <QuickStartDrawer quickStarts={allQuickStarts}>
                <section>
                  <Title headingLevel="h2" size="xl" className="pf-v5-u-mb-md">
                    Live card preview
                  </Title>

                  <div className="rc-tile-preview-wrapper">
                    <WrappedQuickStartTile
                      quickStart={quickStart}
                      bookmarks={null}
                      isActive={false}
                      status={QuickStartStatus.NOT_STARTED}
                    />
                  </div>
                </section>
              </QuickStartDrawer>
            </QuickStartContext.Provider>
          </GridItem>
        </Grid>
      </PageSection>
    </PageGroup>
  );
};

export default Creator;
