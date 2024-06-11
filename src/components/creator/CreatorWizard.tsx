import {
  Form,
  FormGroup,
  FormSection,
  GridItem,
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import React, { ReactNode, useMemo } from 'react';
import { ItemKind, itemKindMeta } from './meta';
import {
  BundleInput,
  DescriptionInput,
  DurationInput,
  InputProps,
  TitleInput,
  TypeInput,
  UrlInput,
} from './CreatorInputs';

type CommonItemState = {
  bundle: string[];
  title: string;
  description: string;
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

export type TaskState = {
  title: string;
  description: string;
};

export const EMPTY_TASK: TaskState = {
  title: '',
  description: '',
};

export type CreatorWizardState = {
  type: ItemKind | null;
  title: string;
  description: string;
  bundles: string[];
  url: string;
  duration: number;
  tasks: TaskState[];
};

const CreatorWizard = ({ value, onChange }: InputProps<CreatorWizardState>) => {
  const selectedType = useMemo(() => {
    if (value.type === null) {
      return null;
    }

    return { id: value.type, meta: itemKindMeta[value.type] };
  }, [value.type]);

  const stepLabel: Record<ItemKind, string> = {
    quickstart: 'Quick start',
    documentation: 'Documentation',
    learningPath: 'Learning Path',
    other: '"Other"',
  };

  const makeOnChangeFn =
    <K extends keyof CreatorWizardState>(key: K) =>
    (newValue: CreatorWizardState[K]) =>
      onChange({ ...value, [key]: newValue });

  const onChangeType = makeOnChangeFn('type');
  const onChangeUrl = makeOnChangeFn('url');
  const onChangeDuration = makeOnChangeFn('duration');
  const onChangeTasks = makeOnChangeFn('tasks');

  const onChangeTask = (index: number, task: TaskState) => {
    const copy = [...value.tasks];
    copy[index] = task;

    return onChangeTasks(copy);
  };

  const commonState: CommonItemState = {
    bundle: value.bundles,
    title: value.title,
    description: value.description,
  };

  const onChangeCommonState = (newCommonState: CommonItemState) => {
    return onChange({
      ...value,
      bundles: newCommonState.bundle,
      title: newCommonState.title,
      description: newCommonState.description,
    });
  };

  /* Need to set a key to force Wizard to re-compute steps when they change. */
  return (
    <Wizard key={selectedType?.id} isVisitRequired>
      <WizardStep name="Select content type" id="rc-wizard-type">
        <p>Learning resources are grouped by their &quot;content type&quot;.</p>

        <TypeInput
          value={selectedType?.id ?? null}
          onChange={(newType) => onChangeType(newType)}
        />
      </WizardStep>

      {selectedType !== null ? (
        <WizardStep
          name={`${stepLabel[selectedType.id]} details`}
          id={`rc-wizard-details`}
        >
          <CommonItemForm
            value={commonState}
            onChange={(state) => onChangeCommonState(state)}
          />

          {selectedType?.meta?.fields?.url === true ? (
            <ItemFormElement>
              <UrlInput
                value={value.url}
                onChange={(newUrl) => onChangeUrl(newUrl)}
              />
            </ItemFormElement>
          ) : null}

          {selectedType?.meta?.fields?.duration === true ? (
            <DurationInput
              value={value.duration}
              onChange={(newDuration) => onChangeDuration(newDuration)}
            />
          ) : null}
        </WizardStep>
      ) : null}

      {selectedType?.meta?.hasTasks === true ? (
        <WizardStep
          name={`Create ${stepLabel[selectedType.id]} panel`}
          id={`rc-wizard-panel`}
          steps={[
            <WizardStep
              key={`overview`}
              id={`rc-wizard-panel-overview`}
              name={`Create ${stepLabel[selectedType.id]} overview`}
            >
              <Form isHorizontal>
                <FormSection title="Tasks">
                  {value.tasks.map((task, index) => {
                    const elementId = `rc-wizard-tasks-task-${index}-title`;

                    return (
                      <FormGroup
                        key={index}
                        label={`Task ${index + 1}`}
                        fieldId={elementId}
                      >
                        <TextInput
                          id={elementId}
                          isRequired
                          type="text"
                          value={task.title}
                          onChange={(_, newTitle) =>
                            onChangeTask(index, {
                              ...task,
                              title: newTitle,
                            })
                          }
                        />
                      </FormGroup>
                    );
                  })}
                </FormSection>
              </Form>
            </WizardStep>,
          ]}
        />
      ) : null}

      {selectedType !== null ? (
        <WizardStep
          name="Generate files"
          id={`rc-wizard-generate-files`}
        ></WizardStep>
      ) : null}
    </Wizard>
  );
};

export default CreatorWizard;
