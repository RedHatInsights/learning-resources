import {
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSection,
  GridItem,
  TextInput,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import MinusCircleIcon from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
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
import { CodeEditor, Language } from '@patternfly/react-code-editor';

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
  introduction: string;
  prerequisites: string;
};

const MAX_TASKS = 10;

const CreatorWizard = ({ value, onChange }: InputProps<CreatorWizardState>) => {
  const selectedType = useMemo(() => {
    if (value.type === null) {
      return null;
    }

    return { id: value.type, meta: itemKindMeta[value.type] };
  }, [value.type]);

  const stepLabelOfType: Record<ItemKind, string> = {
    quickstart: 'Quick start',
    documentation: 'Documentation',
    learningPath: 'Learning Path',
    other: '"Other"',
  };

  const selectedTypeStepLabel =
    selectedType !== null ? stepLabelOfType[selectedType.id] : null;

  const makeOnChangeFn =
    <K extends keyof CreatorWizardState>(key: K) =>
    (newValue: CreatorWizardState[K]) =>
      onChange({ ...value, [key]: newValue });

  const onChangeType = makeOnChangeFn('type');
  const onChangeUrl = makeOnChangeFn('url');
  const onChangeDuration = makeOnChangeFn('duration');
  const onChangeTasks = makeOnChangeFn('tasks');
  const onChangeIntroduction = makeOnChangeFn('introduction');
  const onChangePrerequisites = makeOnChangeFn('prerequisites');

  const onChangeTask = (index: number, task: TaskState) => {
    const copy = [...value.tasks];
    copy[index] = task;

    return onChangeTasks(copy);
  };

  const onAddTask = () => {
    if (value.tasks.length < MAX_TASKS) {
      onChangeTasks([...value.tasks, EMPTY_TASK]);
    }
  };

  const onRemoveTask = (index: number) => {
    // Never allow the final task to be removed.
    if (value.tasks.length > 1) {
      const newTasks = [...value.tasks];
      onChangeTasks(newTasks.toSpliced(index, 1));
    }
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

  // A Wizard will cache its steps when it is initially created. We can't
  // recreate the Wizard when the steps change because this will reset it back
  // to step 1 (and also remove focus from elements, which is terrible for
  // accessibility). However, we can change the visibility of steps.
  //
  // So, we need to ensure a constant number of steps is always created. Thus,
  // we set a bound on the number of tasks and generate one step for possible
  // task up to this bound (which is hidden if the task does not yet exist).

  const taskSubSteps = [];

  for (let index = 0; index < MAX_TASKS; ++index) {
    const isPresent = index < value.tasks.length;
    const task = value.tasks[index];

    taskSubSteps.push(
      <WizardStep
        id={`rc-wizard-panel-task-${index}`}
        name={`Task ${index + 1}`}
        isHidden={selectedType === null || !isPresent}
      >
        {isPresent ? (
          <section>
            <Title headingLevel={'h2'} size="xl">
              {task.title}
            </Title>
          </section>
        ) : null}
      </WizardStep>
    );
  }

  return (
    <Wizard isVisitRequired>
      <WizardStep name="Select content type" id="rc-wizard-type">
        <p>Learning resources are grouped by their &quot;content type&quot;.</p>

        <TypeInput
          value={selectedType?.id ?? null}
          onChange={(newType) => onChangeType(newType)}
        />
      </WizardStep>

      <WizardStep
        id={`rc-wizard-details`}
        name={`${selectedTypeStepLabel ?? '[TBD]'} details`}
        isHidden={selectedType === null}
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

      <WizardStep
        id={`rc-wizard-panel`}
        name={`Create ${selectedTypeStepLabel ?? '[TBD]'} panel`}
        isHidden={selectedType === null || selectedType.meta.hasTasks !== true}
        steps={[
          <WizardStep
            key={`overview`}
            id={`rc-wizard-panel-overview`}
            name={`Create ${selectedTypeStepLabel ?? '[TBD]'} overview`}
          >
            <Form>
              <FormSection title={`${selectedTypeStepLabel} Overview`}>
                <FormGroup label="Introduction" isRequired>
                  <CodeEditor
                    language={Language.markdown}
                    height="150px"
                    isLanguageLabelVisible
                    isLineNumbersVisible={false}
                    value={value.introduction}
                    onCodeChange={(newIntroduction) =>
                      onChangeIntroduction(newIntroduction)
                    }
                  />
                </FormGroup>

                <FormGroup label="Prerequisites" isRequired>
                  <CodeEditor
                    language={Language.markdown}
                    height="150px"
                    isLanguageLabelVisible
                    isLineNumbersVisible={false}
                    value={value.prerequisites}
                    onCodeChange={(newPrerequisites) =>
                      onChangePrerequisites(newPrerequisites)
                    }
                  />
                </FormGroup>
              </FormSection>
            </Form>

            <Form isHorizontal>
              <FormSection title="Tasks">
                {value.tasks.map((task, index) => {
                  const elementId = `rc-wizard-panel-overview-tasks-task-${index}-title`;

                  return (
                    <FormGroup
                      key={index}
                      label={`Task ${index + 1}`}
                      fieldId={elementId}
                    >
                      <Flex gap={{ default: 'gapNone' }}>
                        <FlexItem grow={{ default: 'grow' }}>
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
                        </FlexItem>

                        {value.tasks.length > 1 ? (
                          <FlexItem>
                            <Button
                              variant="plain"
                              icon={<MinusCircleIcon />}
                              onClick={() => onRemoveTask(index)}
                            />
                          </FlexItem>
                        ) : null}
                      </Flex>
                    </FormGroup>
                  );
                })}

                {value.tasks.length < MAX_TASKS ? (
                  <Button
                    variant="link"
                    icon={<PlusCircleIcon />}
                    onClick={() => onAddTask()}
                  >
                    Add another task
                  </Button>
                ) : (
                  <span>A quickstart can only have {MAX_TASKS} tasks.</span>
                )}
              </FormSection>
            </Form>
          </WizardStep>,
          ...taskSubSteps,
        ]}
      />

      <WizardStep
        id={`rc-wizard-generate-files`}
        name="Generate files"
        isHidden={selectedType === null}
      ></WizardStep>
    </Wizard>
  );
};

export default CreatorWizard;
