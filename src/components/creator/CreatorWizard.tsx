import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSection,
  TextInput,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import MinusCircleIcon from '@patternfly/react-icons/dist/esm/icons/minus-circle-icon';
import DownloadIcon from '@patternfly/react-icons/dist/esm/icons/download-icon';
import React, { ReactNode, useId, useMemo } from 'react';
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
import { downloadFile } from '@redhat-cloud-services/frontend-components-utilities/helpers';

type StringArrayInputProps = {
  value: string[];
  groupLabel: string;
  itemLabel: (index: number) => string;
  add?: { onAdd: () => void; label: string };
  remove?: {
    onRemove: (index: number) => void;
    label: (index: number) => string;
  };
  onChange: (index: number, newValue: string) => void;
};

// function expandLabel(
//   props: StringArrayInputLabelProps
// ): StringArrayInputLabelFns {
//   if ('kind' in props) {
//     return {
//       groupLabel: props.groupLabel ?? `${props.kind}s`,
//       itemLabel: (index) => `${props.kind} ${index + 1}`,
//       addLabel: `Add ${props.kind}`,
//       removeLabel: (index) => `Remove ${props.kind} ${index + 1}`,
//     };
//   }
//
//   return props;
// }

const StringArrayInput = ({
  value,
  groupLabel,
  itemLabel,
  add,
  remove,
  onChange,
}: StringArrayInputProps) => {
  const id = useId();

  return (
    <FormSection title={groupLabel}>
      {value.map((element, index) => {
        const elementId = `${id}-${index}-title`;

        return (
          <FormGroup key={index} label={itemLabel(index)} fieldId={elementId}>
            <Flex gap={{ default: 'gapNone' }}>
              <FlexItem grow={{ default: 'grow' }}>
                <TextInput
                  id={elementId}
                  isRequired
                  type="text"
                  value={element}
                  onChange={(_, newValue) => onChange(index, newValue)}
                />
              </FlexItem>

              {remove !== undefined ? (
                <FlexItem>
                  <Button
                    aria-label={remove.label(index)}
                    variant="plain"
                    icon={<MinusCircleIcon />}
                    onClick={() => remove.onRemove(index)}
                  />
                </FlexItem>
              ) : null}
            </Flex>
          </FormGroup>
        );
      })}

      {add !== undefined ? (
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => add.onAdd()}
        >
          {add.label}
        </Button>
      ) : (
        <span>A quickstart can only have {MAX_TASKS} tasks.</span>
      )}
    </FormSection>
  );
};

type CommonItemState = {
  bundle: string[];
  title: string;
  description: string;
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
  yamlContent: string;
};

export const EMPTY_TASK: TaskState = {
  title: '',
  yamlContent: '',
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
  prerequisites: string[];
};

const MAX_TASKS = 10;

const TaskStepContents = ({ value, onChange }: InputProps<TaskState>) => {
  const id = useId();

  return (
    <section>
      <Title headingLevel={'h2'} size="xl">
        {value.title}
      </Title>

      <Form>
        <FormGroup label="Description" isRequired fieldId={`${id}-code`}>
          <CodeEditor
            id={`${id}-code}`}
            height="400px"
            language={Language.yaml}
            code={value.yamlContent}
            onCodeChange={(newContent) =>
              onChange({ ...value, yamlContent: newContent })
            }
          />
        </FormGroup>
      </Form>
    </section>
  );
};

type CreatorWizardProps = InputProps<CreatorWizardState> & {
  files: {
    name: string;
    content: string;
  }[];
};

const CreatorWizard = ({ value, onChange, files }: CreatorWizardProps) => {
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
    return onChangeTasks(value.tasks.toSpliced(index, 1, task));
  };

  const onAddTask = () => {
    if (value.tasks.length < MAX_TASKS) {
      onChangeTasks(value.tasks.concat(EMPTY_TASK));
    }
  };

  const onRemoveTask = (index: number) => {
    // Never allow the final task to be removed.
    if (value.tasks.length > 1) {
      onChangeTasks(value.tasks.toSpliced(index, 1));
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
          <TaskStepContents
            value={task}
            onChange={(newTask) => onChangeTask(index, newTask)}
          />
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
          <UrlInput
            value={value.url}
            onChange={(newUrl) => onChangeUrl(newUrl)}
          />
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
            <Form isHorizontal>
              <FormSection title={`${selectedTypeStepLabel} Overview`}>
                <FormGroup label="Introduction" isRequired>
                  <CodeEditor
                    language={Language.markdown}
                    height="150px"
                    isLanguageLabelVisible
                    isLineNumbersVisible={false}
                    code={value.introduction}
                    onCodeChange={(newIntroduction) =>
                      onChangeIntroduction(newIntroduction)
                    }
                  />
                </FormGroup>

                <StringArrayInput
                  groupLabel="Prerequisites"
                  itemLabel={(index) => `Prerequisite ${index + 1}`}
                  value={value.prerequisites}
                  onChange={(index, newPrereq) =>
                    onChangePrerequisites(
                      value.prerequisites.toSpliced(index, 1, newPrereq)
                    )
                  }
                  add={{
                    label: 'Add prerequisite',
                    onAdd: () =>
                      onChangePrerequisites(value.prerequisites.concat('')),
                  }}
                  remove={{
                    label: (index) => `Remove prerequisite ${index + 1}`,
                    onRemove: (index) =>
                      onChangePrerequisites(
                        value.prerequisites.toSpliced(index, 1)
                      ),
                  }}
                />
              </FormSection>
            </Form>

            <Form isHorizontal>
              <StringArrayInput
                groupLabel="Tasks"
                value={value.tasks.map((task) => task.title)}
                itemLabel={(index) => `Task ${index + 1}`}
                onChange={(index, newTitle) =>
                  onChangeTask(index, {
                    ...value.tasks[index],
                    title: newTitle,
                  })
                }
                add={
                  value.tasks.length < MAX_TASKS
                    ? {
                        label: 'Add another task',
                        onAdd: () => onAddTask(),
                      }
                    : undefined
                }
                remove={
                  value.tasks.length > 1
                    ? {
                        label: (index) => `Remove task ${index + 1}`,
                        onRemove: (index) => onRemoveTask(index),
                      }
                    : undefined
                }
              />
            </Form>
          </WizardStep>,
          ...taskSubSteps,
        ]}
      />

      <WizardStep
        id={`rc-wizard-generate-files`}
        name={'Generate files'}
        isHidden={selectedType === null}
      >
        <div>
          Download these files.
          {files.map((file) => (
            <div key={file.name}>
              <Button
                variant="secondary"
                icon={<DownloadIcon />}
                onClick={() => {
                  const dotIndex = file.name.lastIndexOf('.');
                  const baseName =
                    dotIndex !== -1
                      ? file.name.substring(0, dotIndex)
                      : file.name;
                  const extension =
                    dotIndex !== -1 ? file.name.substring(dotIndex + 1) : 'txt';

                  downloadFile(file.content, baseName, extension);
                }}
              >
                {file.name}
              </Button>

              <ClipboardCopy
                isCode
                isReadOnly
                variant={ClipboardCopyVariant.expansion}
                hoverTip="Copy"
                clickTip="Copied"
              >
                {file.content}
              </ClipboardCopy>
            </div>
          ))}
        </div>
      </WizardStep>
    </Wizard>
  );
};

export default CreatorWizard;
