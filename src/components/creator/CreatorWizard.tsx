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
import PlusCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/plus-circle-icon';
import MinusCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/minus-circle-icon';
import DownloadIcon from '@patternfly/react-icons/dist/dynamic/icons/download-icon';
import React, { ReactNode, useId } from 'react';
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
import { CreatorErrors } from '../../Creator';
import { QuickStart, QuickStartSpec } from '@patternfly/quickstarts';

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

const TaskStepContents = ({
  title,
  onChangeContent,
  content,
  error,
}: {
  title: string;
  content: string;
  onChangeContent: (newContent: string) => void;
  error?: string;
}) => {
  const id = useId();

  return (
    <section>
      <Title headingLevel={'h2'} size="xl">
        {title}
      </Title>

      <FormGroup label="Task YAML" isRequired fieldId={`${id}-code`}>
        <CodeEditor
          id={`${id}-code}`}
          height="400px"
          language={Language.yaml}
          code={content}
          onCodeChange={onChangeContent}
        />
      </FormGroup>

      {error !== undefined ? <pre>{error}</pre> : null}
    </section>
  );
};

type CreatorWizardProps = {
  type: ItemKind | null;
  onChangeType: (newType: ItemKind | null) => void;
  quickStart: QuickStart;
  onChangeQuickStartSpec: (newValue: QuickStartSpec) => void;
  bundles: string[];
  onChangeBundles: (newValue: string[]) => void;
  taskContents: string[];
  onAddTask: () => void;
  onRemoveTask: (index: number) => void;
  onChangeTaskContents: (contents: string[]) => void;
  files: {
    name: string;
    content: string;
  }[];
  errors: CreatorErrors;
};

const CreatorWizard = ({
  type,
  onChangeType,
  quickStart,
  onChangeQuickStartSpec,
  bundles,
  onChangeBundles,
  taskContents,
  onChangeTaskContents,
  onAddTask,
  onRemoveTask,
  files,
  errors,
}: CreatorWizardProps) => {
  const selectedType =
    type !== null ? { id: type, meta: itemKindMeta[type] } : null;

  const stepLabelOfType: Record<ItemKind, string> = {
    quickstart: 'Quick start',
    documentation: 'Documentation',
    learningPath: 'Learning Path',
    other: '"Other"',
  };

  const selectedTypeStepLabel =
    selectedType !== null ? stepLabelOfType[selectedType.id] : null;

  const makeOnChangeSpecFn =
    <K extends keyof QuickStartSpec>(key: K) =>
    (newValue: QuickStartSpec[K]) =>
      onChangeQuickStartSpec({
        ...quickStart.spec,
        [key]: newValue,
      });

  const onChangeDuration = makeOnChangeSpecFn('durationMinutes');
  const onChangeTasks = makeOnChangeSpecFn('tasks');
  const onChangeIntroduction = makeOnChangeSpecFn('introduction');
  const onChangePrerequisites = makeOnChangeSpecFn('prerequisites');

  const onChangeUrl = (url: string) => {
    onChangeQuickStartSpec({
      ...quickStart.spec,
      link: {
        href: url,
        text: 'View documentation',
      },
    });
  };

  const onChangeTaskTitle = (index: number, newTitle: string) => {
    const tasks = quickStart.spec.tasks;

    if (tasks !== undefined && index < tasks.length) {
      onChangeTasks(
        tasks.toSpliced(index, 1, {
          ...tasks[index],
          title: newTitle,
        })
      );
    }
  };

  const onChangeTaskContent = (index: number, content: string) => {
    const tasks = quickStart.spec.tasks;

    if (tasks !== undefined && index < tasks.length) {
      onChangeTaskContents(taskContents.toSpliced(index, 1, content));
    }
  };

  const commonState: CommonItemState = {
    bundle: bundles,
    title: quickStart.spec.displayName,
    description: quickStart.spec.description,
  };

  const onChangeCommonState = (newCommonState: CommonItemState) => {
    onChangeQuickStartSpec({
      ...quickStart.spec,
      displayName: newCommonState.title,
      description: newCommonState.description,
    });

    onChangeBundles(newCommonState.bundle);
  };

  const spec = quickStart.spec;

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
    const isPresent = spec.tasks !== undefined && index < spec.tasks.length;

    taskSubSteps.push(
      <WizardStep
        id={`rc-wizard-panel-task-${index}`}
        name={`Task ${index + 1}`}
        isHidden={selectedType === null || !isPresent}
      >
        {isPresent ? (
          <TaskStepContents
            title={spec.tasks?.[index].title ?? ''}
            content={taskContents[index]}
            onChangeContent={(newTask) => onChangeTaskContent(index, newTask)}
            error={errors.taskErrors.get(index)}
          />
        ) : null}
      </WizardStep>
    );
  }

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Wizard isVisitRequired>
        <WizardStep name="Select content type" id="rc-wizard-type">
          <p>
            Learning resources are grouped by their &quot;content type&quot;.
          </p>

          <TypeInput value={selectedType?.id ?? null} onChange={onChangeType} />
        </WizardStep>

        <WizardStep
          id={`rc-wizard-details`}
          name={`${selectedTypeStepLabel ?? '[TBD]'} details`}
          isHidden={selectedType === null}
        >
          <CommonItemForm value={commonState} onChange={onChangeCommonState} />

          {selectedType?.meta?.fields?.url === true ? (
            <UrlInput value={spec.link?.href ?? ''} onChange={onChangeUrl} />
          ) : null}

          {selectedType?.meta?.fields?.duration === true ? (
            <DurationInput
              value={spec.durationMinutes ?? 0}
              onChange={onChangeDuration}
            />
          ) : null}
        </WizardStep>

        <WizardStep
          id={`rc-wizard-panel`}
          name={`Create ${selectedTypeStepLabel ?? '[TBD]'} panel`}
          isHidden={
            selectedType === null || selectedType.meta.hasTasks !== true
          }
          steps={[
            <WizardStep
              key={`overview`}
              id={`rc-wizard-panel-overview`}
              name={`Create ${selectedTypeStepLabel ?? '[TBD]'} overview`}
            >
              <FormSection title={`${selectedTypeStepLabel} Overview`}>
                <FormGroup label="Introduction" isRequired>
                  <CodeEditor
                    language={Language.markdown}
                    height="150px"
                    isLanguageLabelVisible
                    isLineNumbersVisible={false}
                    code={spec.introduction}
                    onCodeChange={(newIntroduction) =>
                      onChangeIntroduction(newIntroduction)
                    }
                  />
                </FormGroup>

                <StringArrayInput
                  groupLabel="Prerequisites"
                  itemLabel={(index) => `Prerequisite ${index + 1}`}
                  value={spec.prerequisites ?? []}
                  onChange={(index, newPrereq) => {
                    if (
                      spec.prerequisites !== undefined &&
                      index < spec.prerequisites.length
                    ) {
                      onChangePrerequisites(
                        spec.prerequisites.toSpliced(index, 1, newPrereq)
                      );
                    }
                  }}
                  add={{
                    label: 'Add prerequisite',
                    onAdd: () =>
                      onChangePrerequisites(
                        (spec.prerequisites ?? []).concat('')
                      ),
                  }}
                  remove={{
                    label: (index) => `Remove prerequisite ${index + 1}`,
                    onRemove: (index) => {
                      if (
                        spec.prerequisites !== undefined &&
                        index < spec.prerequisites.length
                      ) {
                        onChangePrerequisites(
                          spec.prerequisites.toSpliced(index, 1)
                        );
                      }
                    },
                  }}
                />
              </FormSection>

              <StringArrayInput
                groupLabel="Tasks"
                value={spec.tasks?.map((task) => task.title ?? '') ?? []}
                itemLabel={(index) => `Task ${index + 1}`}
                onChange={(index, newTitle) => {
                  onChangeTaskTitle(index, newTitle);
                }}
                add={
                  spec.tasks === undefined || spec.tasks.length < MAX_TASKS
                    ? {
                        label: 'Add another task',
                        onAdd: onAddTask,
                      }
                    : undefined
                }
                remove={
                  spec.tasks !== undefined && spec.tasks.length > 1
                    ? {
                        label: (index) => `Remove task ${index + 1}`,
                        onRemove: onRemoveTask,
                      }
                    : undefined
                }
              />
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
                      dotIndex !== -1
                        ? file.name.substring(dotIndex + 1)
                        : 'txt';

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
    </Form>
  );
};

export default CreatorWizard;
