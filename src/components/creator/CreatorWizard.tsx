import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
} from '@patternfly/react-core';
import DownloadIcon from '@patternfly/react-icons/dist/dynamic/icons/download-icon';
import React, { useContext, useEffect, useMemo } from 'react';
import { ItemKind, isItemKind, metaForKind } from './meta';
import { CreatorErrors } from '../../Creator';
import { QuickStartSpec } from '@patternfly/quickstarts';
import {
  AnyObject,
  FormRenderer,
  FormSpy,
} from '@data-driven-forms/react-form-renderer';
import DdfWizardContext from '@data-driven-forms/react-form-renderer/wizard-context';
import pf4ComponentMapper from '@data-driven-forms/pf4-component-mapper/component-mapper';
import {
  NAME_BUNDLES,
  NAME_DESCRIPTION,
  NAME_DURATION,
  NAME_KIND,
  NAME_PANEL_INTRODUCTION,
  NAME_PREREQUISITES,
  NAME_TASKS_ARRAY,
  NAME_TASK_TITLES,
  NAME_TITLE,
  NAME_URL,
  makeSchema,
  taskFromStepName,
} from './schema';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { downloadFile } from '@redhat-cloud-services/frontend-components-utilities/helpers';

export type TaskState = {
  title: string;
  yamlContent: string;
};

export const EMPTY_TASK: TaskState = {
  title: '',
  yamlContent: '',
};

type CreatorFiles = {
  name: string;
  content: string;
}[];

type CreatorWizardProps = {
  onChangeKind: (newKind: ItemKind | null) => void;
  onChangeQuickStartSpec: (newValue: QuickStartSpec) => void;
  onChangeBundles: (newValue: string[]) => void;
  onChangeTaskContents: (contents: string[]) => void;
  onChangeCurrentTask: (index: number | null) => void;
  files: CreatorFiles;
  errors: CreatorErrors;
};

type FormValue = AnyObject;

type UpdaterProps = {
  values: FormValue;
  onChangeKind: (newKind: ItemKind | null) => void;
  onChangeBundles: (bundles: string[]) => void;
  onChangeQuickStartSpec: (newValue: QuickStartSpec) => void;
  onChangeTaskContents: (contents: string[]) => void;
};

const DEFAULT_TASK_TITLES: string[] = [''];

const PropUpdater = ({
  values,
  onChangeKind,
  onChangeBundles,
  onChangeQuickStartSpec,
  onChangeTaskContents,
}: UpdaterProps) => {
  const bundles = values[NAME_BUNDLES];

  useEffect(() => {
    onChangeBundles(bundles ?? []);
  }, [bundles]);

  const rawKind: string | undefined = values[NAME_KIND];
  const title: string | undefined = values[NAME_TITLE];
  const description: string | undefined = values[NAME_DESCRIPTION];
  const url: string | undefined = values[NAME_URL];
  const duration: number | string | undefined = values[NAME_DURATION];
  const prerequisites: string[] | undefined = values[NAME_PREREQUISITES];
  const introduction: string | undefined = values[NAME_PANEL_INTRODUCTION];

  const taskTitles: string[] = values[NAME_TASK_TITLES] ?? DEFAULT_TASK_TITLES;
  const taskValues: { content: string | undefined }[] | undefined =
    values[NAME_TASKS_ARRAY];

  const kind =
    typeof rawKind === 'string' && isItemKind(rawKind) ? rawKind : null;

  const meta = kind !== null ? metaForKind(kind) : null;

  useEffect(() => {
    onChangeKind(kind);
  }, [kind]);

  const taskContents = useMemo(() => {
    if (meta?.hasTasks !== true) {
      return [];
    }

    const effective = [];

    for (let i = 0; i < (taskTitles?.length ?? 0); ++i) {
      effective.push(taskValues?.[i]?.content ?? '');
    }

    return effective;
  }, [meta, taskTitles, taskValues]);

  useEffect(() => {
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
          ? duration
          : undefined,
      prerequisites: meta?.hasTasks === true ? prerequisites : undefined,
      introduction: meta?.hasTasks === true ? introduction : undefined,
      tasks:
        meta?.hasTasks === true
          ? (taskTitles ?? []).map((t) => ({ title: t }))
          : undefined,
    });
  }, [
    meta,
    rawKind,
    title,
    description,
    url,
    duration,
    prerequisites,
    introduction,
    taskTitles,
  ]);

  useEffect(() => {
    onChangeTaskContents(taskContents);
  }, [taskContents]);

  // Allow use as JSX component
  return undefined;
};

const CreatorWizardContext = React.createContext<{
  errors: CreatorErrors;
  files: CreatorFiles;
  onChangeCurrentTask: (index: number | null) => void;
}>({
  errors: {
    taskErrors: new Map(),
  },
  files: [],
  onChangeCurrentTask: () => {},
});

const TaskErrorPreview = ({ index }: { index: number }) => {
  const context = useContext(CreatorWizardContext);
  const error = context.errors.taskErrors.get(index);

  return error !== undefined ? (
    <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
  ) : undefined;
};

const FileDownload = () => {
  const { files } = useContext(CreatorWizardContext);

  return (
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
                dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
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
  );
};

// Watches for changes in the current step, then calls onChangeCurrentTask so
// that Creator can update the live preview.
const WizardSpy = () => {
  const wizardContext = useContext(DdfWizardContext);
  const creatorContext = useContext(CreatorWizardContext);

  useEffect(() => {
    creatorContext.onChangeCurrentTask(
      taskFromStepName(wizardContext.currentStep.name)
    );
  }, [wizardContext.currentStep.name]);

  return undefined;
};

const CreatorWizard = ({
  onChangeKind,
  onChangeQuickStartSpec,
  onChangeBundles,
  onChangeTaskContents,
  onChangeCurrentTask,
  files,
  errors,
}: CreatorWizardProps) => {
  const chrome = useChrome();
  const schema = useMemo(() => makeSchema(chrome), []);

  const context = useMemo(
    () => ({
      errors,
      files,
      onChangeCurrentTask,
    }),
    [errors, files]
  );

  const componentMapper = {
    ...pf4ComponentMapper,
    'lr-task-error': TaskErrorPreview,
    'lr-download-files': FileDownload,
    'lr-wizard-spy': WizardSpy,
  };

  return (
    <CreatorWizardContext.Provider value={context}>
      <FormRenderer
        onSubmit={() => {}}
        schema={schema}
        componentMapper={componentMapper}
      >
        {({ formFields }) => (
          <form onSubmit={(e) => e.preventDefault()} className="pf-v5-c-form">
            <FormSpy subscription={{ values: true }}>
              {/*
            In order to display the live preview, we need to update the parent
            whenever the form state changes. Unfortunately, as best as I can
            tell, there is no way to pass FormRenderer a callback that's called
            whenever a value changes.

            The example at [0] shows using a custom component in the schema to
            watch the values, but it seems clearer to just add it once here
            (and it avoids introducing another custom component name).

            [0]: https://github.com/data-driven-forms/react-forms/blob/master/packages/react-renderer-demo/src/examples/components/examples/value-listener.js
             */}
              {(props) => (
                <PropUpdater
                  values={props.values}
                  onChangeKind={onChangeKind}
                  onChangeBundles={onChangeBundles}
                  onChangeQuickStartSpec={onChangeQuickStartSpec}
                  onChangeTaskContents={onChangeTaskContents}
                />
              )}
            </FormSpy>
            <>{formFields}</>
          </form>
        )}
      </FormRenderer>
    </CreatorWizardContext.Provider>
  );
};

export default CreatorWizard;
