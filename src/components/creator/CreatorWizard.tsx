import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormSection,
  TextInput,
  Title,
} from '@patternfly/react-core';
import PlusCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/plus-circle-icon';
import MinusCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/minus-circle-icon';
import React, { ReactNode, useEffect, useId, useMemo } from 'react';
import { ItemKind, isItemKind, itemKindMeta } from './meta';
import {
  BundleInput,
  DescriptionInput,
  InputProps,
  TitleInput,
} from './CreatorInputs';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { CreatorErrors } from '../../Creator';
import { QuickStart, QuickStartSpec } from '@patternfly/quickstarts';
import { FormRenderer, FormSpy } from '@data-driven-forms/react-form-renderer';
import { FormTemplate } from '@data-driven-forms/pf4-component-mapper';
import componentMapper from '@data-driven-forms/pf4-component-mapper/component-mapper';
import {
  NAME_BUNDLES,
  NAME_DESCRIPTION,
  NAME_DURATION,
  NAME_TITLE,
  NAME_TYPE,
  NAME_URL,
  makeSchema,
} from './schema';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';

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

      {error !== undefined ? (
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {'Error:\n\n'}
          {error}
        </pre>
      ) : null}
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
  onChangeCurrentTask: (index: number | null) => void;
  files: {
    name: string;
    content: string;
  }[];
  errors: CreatorErrors;
};

type FormValue = Record<string, any>;

type UpdaterProps = {
  values: FormValue;
  onChangeBundles: (bundles: string[]) => void;
  onChangeQuickStartSpec: (newValue: QuickStartSpec) => void;
};

const PropUpdater = ({
  values,
  onChangeBundles,
  onChangeQuickStartSpec,
}: UpdaterProps) => {
  const bundles = values[NAME_BUNDLES];

  useEffect(() => {
    onChangeBundles(bundles ?? []);
  }, [bundles]);

  const type = values[NAME_TYPE];
  const title = values[NAME_TITLE];
  const description = values[NAME_DESCRIPTION];
  const url = values[NAME_URL];
  const duration = values[NAME_DURATION];

  console.log('duration', duration);

  useEffect(() => {
    const meta =
      typeof type === 'string' && isItemKind(type) ? itemKindMeta[type] : null;

    onChangeQuickStartSpec({
      type:
        meta !== null
          ? {
              text: meta.displayName,
              color: meta.tagColor,
            }
          : undefined,
      displayName: title ?? '',
      description: description ?? '',
      icon: null,
      link:
        meta?.fields?.url && url !== undefined
          ? {
              text: 'View documentation',
              href: url,
            }
          : undefined,
      durationMinutes:
        meta?.fields?.duration && typeof duration === 'number'
          ? Number(duration)
          : undefined,
    });
  }, [type, title, description, url, duration]);

  // Allow use as JSX component
  return undefined;
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
  onChangeCurrentTask,
  files,
  errors,
}: CreatorWizardProps) => {
  const chrome = useChrome();
  const schema = useMemo(() => makeSchema(chrome), []);

  return (
    <FormRenderer
      onSubmit={() => {}}
      schema={schema}
      componentMapper={componentMapper}
      FormTemplate={FormTemplate}
    >
      <FormSpy subscription={{ values: true }}>
        {(props) => (
          <PropUpdater
            values={props.values}
            onChangeBundles={onChangeBundles}
            onChangeQuickStartSpec={onChangeQuickStartSpec}
          />
        )}
      </FormSpy>
    </FormRenderer>
  );
};

export default CreatorWizard;
