import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  FormGroup,
  Grid,
  GridItem,
  NumberInput,
  PageGroup,
  PageSection,
  Radio,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardStep,
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
import SelectMultiTypeahead from './components/SelectMultiTypeahead';

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
  bundle: string[];
  title: string;
  description: string;
};

type InputProps<T> = {
  value: T;
  onChange: (newValue: T) => void;
};

const TypeInput = ({ value, onChange }: InputProps<ItemKind | null>) => {
  const elementId = `rc-input-type`;

  return (
    <FormGroup label="Select content type" isRequired fieldId={elementId}>
      <FormGroup
        id={elementId}
        role="radiogroup"
        aria-label="Select content type"
      >
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

const BundleInput = ({ value, onChange }: InputProps<string[]>) => {
  const { getAvailableBundles } = useChrome();
  const bundles = useMemo(() => getAvailableBundles(), []);
  const elementId = `rc-input-bundle`;

  return (
    <FormGroup label="Bundles" isRequired fieldId={elementId}>
      <SelectMultiTypeahead
        options={bundles.map((b) => ({
          value: b.id,
          children: `${b.title} (${b.id})`,
        }))}
        selected={value}
        onChangeSelected={onChange}
      />
    </FormGroup>
  );
};

const TitleInput = ({ value, onChange }: InputProps<string>) => {
  const elementId = `rc-input-title`;

  return (
    <FormGroup label="Title" isRequired fieldId={elementId}>
      <TextInput
        id={elementId}
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
  const elementId = `rc-input-description`;

  return (
    <FormGroup label="Description" isRequired fieldId={elementId}>
      <TextArea
        id={elementId}
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
  const elementId = `rc-input-url`;

  return (
    <FormGroup label="Resource URL" isRequired fieldId={elementId}>
      <TextInput
        id={elementId}
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
  const elementId = `rc-input-duration`;

  return (
    <FormGroup
      label="Approximate completion time"
      isRequired
      fieldId={elementId}
    >
      <NumberInput
        id={elementId}
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

type ItemInputDesc = {
  key: keyof CommonItemState;
  element: (props: InputProps<unknown>) => ReactNode;
};

// Checks that type of element matches the key, then erases the type.
function itemInputDesc<K extends keyof CommonItemState>(
  key: K,
  element: (props: InputProps<CommonItemState[K]>) => ReactNode
): ItemInputDesc {
  return {
    key,
    element: element as (props: InputProps<unknown>) => ReactNode,
  };
}

const CommonItemForm = ({ value, onChange }: InputProps<CommonItemState>) => {
  const commonInputs: ItemInputDesc[] = [
    itemInputDesc('bundle', BundleInput),
    itemInputDesc('title', TitleInput),
    itemInputDesc('description', DescriptionInput),
  ];

  return (
    <>
      {...commonInputs.map(({ key, element: ComponentType }: ItemInputDesc) => (
        <div key={key}>
          <ComponentType
            value={value[key]}
            onChange={(newValue) => onChange({ ...value, [key]: newValue })}
          />
        </div>
      ))}
    </>
  );
};

const Creator = () => {
  const [selectedType, setSelectedType] = useState<ItemKind | null>(null);
  const typeMeta = selectedType !== null ? itemKindMeta[selectedType] : null;

  const [commonState, setCommonState] = useState<CommonItemState>({
    bundle: [],
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

  if (typeMeta?.hasTasks !== true && activeQuickStart !== '') {
    setActiveQuickStart('');
  }

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

  const stepLabel: Record<ItemKind, string> = {
    quickstart: 'Quick start',
    documentation: 'Documentation',
    learningPath: 'Learning Path',
    other: '"Other"',
  };

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
            {/* Need to set a key to force Wizard to re-compute steps when they change. */}
            <Wizard key={selectedType} isVisitRequired>
              <WizardStep name="Select content type" id="rc-wizard-type">
                <p>
                  Learning resources are grouped by their &quot;content
                  type&quot;.
                </p>

                <TypeInput
                  value={selectedType}
                  onChange={(newType) => setSelectedType(newType)}
                />
              </WizardStep>

              {selectedType !== null ? (
                <WizardStep
                  name={`${stepLabel[selectedType]} details`}
                  id={`rc-wizard-${selectedType}-details`}
                >
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
                    <DurationInput
                      value={currentDuration}
                      onChange={(newDuration) =>
                        setCurrentDuration(newDuration)
                      }
                    />
                  ) : null}
                </WizardStep>
              ) : null}

              {selectedType !== null && typeMeta?.hasTasks == true ? (
                <WizardStep
                  name={`Create ${stepLabel[selectedType]} panel`}
                  id={`rc-wizard-${selectedType}-tasks`}
                ></WizardStep>
              ) : null}

              {selectedType !== null ? (
                <WizardStep
                  name="Generate files"
                  id={`rc-wizard-generate-files`}
                ></WizardStep>
              ) : null}
            </Wizard>
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
