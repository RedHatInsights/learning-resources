import {
  Banner,
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from '@patternfly/react-core';
import CheckCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/check-circle-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/dynamic/icons/code-branch-icon';
import DownloadIcon from '@patternfly/react-icons/dist/dynamic/icons/download-icon';
import React, {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CreatorWizardStage, ItemKind, isItemKind, metaForKind } from './meta';
import { QuickStartSpec, QuickStartTask } from '@patternfly/quickstarts';
import {
  AnyObject,
  FormRenderer,
  FormSpy,
} from '@data-driven-forms/react-form-renderer';
import DdfWizardContext from '@data-driven-forms/react-form-renderer/wizard-context';
import pf4ComponentMapper from '@data-driven-forms/pf4-component-mapper/component-mapper';
import { makeSchema, stageFromStepName } from './schema';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { downloadFile } from '@redhat-cloud-services/frontend-components-utilities/helpers';
import SimpleButton from '../SimpleButton';
import DdfNumberInput from '../DdfNumberInput';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import {
  NAME_BUNDLES,
  NAME_DESCRIPTION,
  NAME_DURATION,
  NAME_ICON,
  NAME_KIND,
  NAME_METADATA_NAME,
  NAME_PANEL_INTRODUCTION,
  NAME_PREREQUISITES,
  NAME_TAGS,
  NAME_TASKS_ARRAY,
  NAME_TASK_TITLES,
  NAME_TITLE,
  NAME_URL,
} from './steps/common';
import StringArrayInput from '../StringArrayInput';
import { CreatorWizardContext, ResumePR } from './context';
import { NAME_SOURCE } from './steps/source';
import { CreatorFiles } from './types';
import { FilterData } from '../../utils/FiltersCategoryInterface';
import TagsSelector from './TagsSelector';
import CreatorYAMLView from './CreatorYAMLView';
import { useCreatePR } from './useCreatePR';
import SourceSelector from './SourceSelector';
import { useFlag } from '@unleash/proxy-client-react';
import CreatePRModal from './CreatePRModal';

export type CreatorWizardProps = {
  onChangeKind: (newKind: ItemKind | null) => void;
  onChangeQuickStartSpec: (newValue: QuickStartSpec) => void;
  onChangeBundles: (newValue: string[]) => void;
  onChangeCurrentStage: (stage: CreatorWizardStage) => void;
  resetCreator: () => void;
  files: CreatorFiles;
  filterData: FilterData;
  onChangeTags: (tags: { [kind: string]: string[] }) => void;
  onChangeMetadataTags: (tags: Array<{ kind: string; value: string }>) => void;
  onChangeMetadataName?: (name: string) => void;
  quickStart?: ExtendedQuickstart;
  currentBundles?: string[];
  currentTags?: { [kind: string]: string[] };
  currentKind?: ItemKind | null;
  onChangeKindDirect?: (kind: ItemKind | null) => void;
};

type ViewMode = 'wizard' | 'creator';

type FormValue = AnyObject;

type UpdaterProps = {
  values: FormValue;
  onChangeKind: (newKind: ItemKind | null) => void;
  onChangeBundles: (bundles: string[]) => void;
  onChangeQuickStartSpec: (newValue: QuickStartSpec) => void;
  onChangeTags: CreatorWizardProps['onChangeTags'];
  onChangeMetadataName?: (name: string) => void;
};

const DEFAULT_TASK_TITLES: string[] = [''];

export const EMPTY_TASK: QuickStartTask = {};

type FormTaskValue = {
  description?: string;
  enable_work_check?: boolean;
  work_check_instructions?: string;
  work_check_help?: string;
};

const isValidUrl = (s: string): boolean => {
  try {
    const { protocol } = new URL(s);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const PropUpdater = ({
  values,
  onChangeKind,
  onChangeTags,
  onChangeBundles,
  onChangeQuickStartSpec,
  onChangeMetadataName,
}: UpdaterProps) => {
  const bundles = values[NAME_BUNDLES];
  const tags = values[NAME_TAGS];
  const metadataName: string | undefined = values[NAME_METADATA_NAME];

  useEffect(() => {
    onChangeBundles(bundles ?? []);
  }, [bundles]);

  useEffect(() => {
    onChangeTags(tags ?? {});
  }, [tags]);

  useEffect(() => {
    if (onChangeMetadataName) {
      onChangeMetadataName(metadataName ?? '');
    }
  }, [metadataName]);

  const rawKind: string | undefined = values[NAME_KIND];
  const title: string | undefined = values[NAME_TITLE];
  const description: string | undefined = values[NAME_DESCRIPTION];
  const icon: string | null | undefined = values[NAME_ICON];
  const url: string | undefined = values[NAME_URL];
  const duration: number | string | undefined = values[NAME_DURATION];
  const prerequisites: string[] | undefined = values[NAME_PREREQUISITES];
  const introduction: string | undefined = values[NAME_PANEL_INTRODUCTION];

  const taskTitles: string[] = values[NAME_TASK_TITLES] ?? DEFAULT_TASK_TITLES;
  const taskValues: FormTaskValue[] | undefined = values[NAME_TASKS_ARRAY];

  const kind =
    typeof rawKind === 'string' && isItemKind(rawKind) ? rawKind : null;

  const meta = kind !== null ? metaForKind(kind) : null;

  useEffect(() => {
    onChangeKind(kind);
  }, [kind]);

  const effectiveTasks = useMemo(() => {
    if (meta?.hasTasks !== true) return undefined;

    const out: QuickStartTask[] = [];

    // The task titles array determines how many tasks there should be.
    for (let i = 0; i < taskTitles.length; ++i) {
      const taskValue = taskValues?.[i];

      out.push({
        title: taskTitles[i],
        description: taskValue?.description ?? '',
        review: taskValue?.enable_work_check
          ? {
              instructions: taskValue?.work_check_instructions,
              failedTaskHelp: taskValue?.work_check_help,
            }
          : undefined,
      });
    }

    return out;
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
      icon: icon ?? null,
      link:
        meta?.fields?.url && url !== undefined && isValidUrl(url)
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
      tasks: effectiveTasks,
    });

    onChangeKind(kind);
  }, [
    meta,
    rawKind,
    title,
    description,
    icon,
    url,
    duration,
    prerequisites,
    introduction,
    effectiveTasks,
  ]);

  // Allow use as JSX component
  return undefined;
};

const FileDownload = () => {
  const showGitService = useFlag(
    'platform.learning-resources.quickstarts.git-service'
  );
  const { files } = useContext(CreatorWizardContext);

  const quickstartName = useMemo(() => {
    const yamlFile = files.find(
      (f) => !f.name.startsWith('metadata.') && f.name.endsWith('.yaml')
    );
    if (!yamlFile) return null;
    const name = yamlFile.name.replace(/\.yaml$/, '');
    return name || null;
  }, [files]);

  const {
    prLoading,
    prResult,
    prError,
    canCreatePR,
    handleCreatePR,
    setPrResult,
    setPrError,
    resumePR,
  } = useCreatePR(quickstartName);

  const [prModalOpen, setPrModalOpen] = useState(false);

  const handleOpenPRModal = () => {
    setPrResult(null);
    setPrError(null);
    setPrModalOpen(true);
  };

  const handleClosePRModal = () => {
    setPrModalOpen(false);
  };

  function doDownload(file: { content: string; name: string }) {
    const dotIndex = file.name.lastIndexOf('.');
    const baseName =
      dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    const extension =
      dotIndex !== -1 ? file.name.substring(dotIndex + 1) : 'txt';

    downloadFile(file.content, baseName, extension);
  }

  return (
    <div>
      <Banner screenReaderText="Files successfully generated!" color="green">
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <CheckCircleIcon />
          </FlexItem>
          <FlexItem>Files successfully generated!</FlexItem>
        </Flex>
      </Banner>

      <Stack hasGutter className="pf-v6-u-m-lg">
        <StackItem>
          {showGitService ? (
            <Content component="p">
              Download these files or submit them directly as a pull request.
            </Content>
          ) : (
            <Content component="p">
              Download these files and use them to create the learning resource
              PR in the{' '}
              <a
                href="https://github.com/RedHatInsights/quickstarts/tree/main/docs/quickstarts"
                target="_blank"
                rel="noreferrer"
              >
                {' '}
                correct repo
              </a>
              .
            </Content>
          )}
        </StackItem>

        <StackItem>
          {showGitService ? (
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button
                  variant="primary"
                  icon={<DownloadIcon />}
                  onClick={() => files.forEach((file) => doDownload(file))}
                >
                  Download all ({files.length}) files
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  icon={<CodeBranchIcon />}
                  onClick={handleOpenPRModal}
                  isDisabled={!canCreatePR}
                >
                  {resumePR ? 'Update PR' : 'Create PR'}
                </Button>
              </FlexItem>
            </Flex>
          ) : (
            <Button
              variant="primary"
              icon={<DownloadIcon />}
              onClick={() => files.forEach((file) => doDownload(file))}
            >
              Download all ({files.length}) files
            </Button>
          )}
        </StackItem>

        {showGitService && quickstartName && (
          <CreatePRModal
            isOpen={prModalOpen}
            onClose={handleClosePRModal}
            onConfirm={handleCreatePR}
            quickstartName={quickstartName}
            prLoading={prLoading}
            prResult={prResult}
            prError={prError}
            isContinuePR={!!resumePR}
          />
        )}

        {files.map((file) => (
          <StackItem key={file.name}>
            <SimpleButton
              icon={<DownloadIcon />}
              className="pf-v6-u-mb-sm"
              onClick={() => doDownload(file)}
            >
              {file.name}
            </SimpleButton>

            <ClipboardCopy
              isCode
              isReadOnly
              variant={ClipboardCopyVariant.expansion}
              hoverTip="Copy"
              clickTip="Copied"
            >
              {file.content}
            </ClipboardCopy>
          </StackItem>
        ))}
      </Stack>
    </div>
  );
};

// Watches for changes in the current step, then calls onChangeCurrentTask so
// that Creator can update the live preview.
const WizardSpy = () => {
  const wizardContext = useContext(DdfWizardContext);
  const creatorContext = useContext(CreatorWizardContext);

  useEffect(() => {
    creatorContext.onChangeCurrentStage(
      stageFromStepName(wizardContext.currentStep.name)
    );
  }, [wizardContext.currentStep.name]);

  return undefined;
};

const TaskTitlePreview = ({ index }: { index: number }) => {
  return (
    <FormSpy subscription={{ values: true }}>
      {(state) => (
        <Title headingLevel="h3">
          {state.values?.[NAME_TASK_TITLES]?.[index] ?? ''}
        </Title>
      )}
    </FormSpy>
  );
};

const CreatorWizard = ({
  onChangeKind,
  onChangeQuickStartSpec,
  onChangeBundles,
  onChangeCurrentStage,
  resetCreator,
  onChangeTags,
  onChangeMetadataTags,
  onChangeMetadataName,
  files,
  filterData,
  quickStart,
  currentBundles,
  currentTags,
  currentKind,
  onChangeKindDirect,
}: CreatorWizardProps) => {
  const chrome = useChrome();
  const showGitService = useFlag(
    'platform.learning-resources.quickstarts.git-service'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('wizard');
  const [resumePR, setResumePR] = useState<ResumePR | null>(null);
  const schema = useMemo(
    () => makeSchema(chrome, filterData, showGitService),
    [chrome, filterData, showGitService]
  );
  const availableBundles = useMemo(() => chrome.getAvailableBundles(), []);

  // [viewMode] only, including props like quickStart, currentKind, etc would recompute on
  // every keystroke and cause fields to spazz/lose focus. FormRenderer is unmounted in YAML
  // mode, so switching back triggers a remount with fresh initialValues anyway.
  const initialValues = useMemo(() => {
    if (!quickStart) return undefined;
    return {
      [NAME_SOURCE]: resumePR ? `pr:${resumePR.number}` : undefined,
      [NAME_METADATA_NAME]: quickStart.metadata.name,
      [NAME_KIND]: currentKind || undefined,
      [NAME_BUNDLES]: currentBundles,
      [NAME_TAGS]: currentTags,
      [NAME_TITLE]: quickStart.spec.displayName || '',
      [NAME_ICON]: quickStart.spec.icon ?? null,
      [NAME_DESCRIPTION]: quickStart.spec.description || '',
      [NAME_DURATION]: quickStart.spec.durationMinutes,
      [NAME_URL]: quickStart.spec.link?.href,
      [NAME_PREREQUISITES]: quickStart.spec.prerequisites,
      [NAME_PANEL_INTRODUCTION]: quickStart.spec.introduction,
      [NAME_TASK_TITLES]: quickStart.spec.tasks?.map((t) => t.title || '') || [
        '',
      ],
      [NAME_TASKS_ARRAY]: quickStart.spec.tasks?.map((t) => ({
        description: t.description,
        enable_work_check: !!t.review,
        work_check_instructions: t.review?.instructions,
        work_check_help: t.review?.failedTaskHelp,
      })),
    };
  }, [viewMode]);

  // Update stage when switching to creator mode to show preview
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (newMode === 'creator') {
      onChangeCurrentStage({ type: 'card' });
    }
  };

  const handleResetCreator = () => {
    setResumePR(null);
    resetCreator();
  };

  const context = useMemo(
    () => ({
      files,
      onChangeCurrentStage,
      resetCreator: handleResetCreator,
      resumePR,
      setResumePR,
    }),
    [files, onChangeCurrentStage, resumePR, resetCreator]
  );

  const componentMapper = {
    ...pf4ComponentMapper,
    'lr-number-input': DdfNumberInput,
    'lr-download-files': FileDownload,
    'lr-wizard-spy': WizardSpy,
    'lr-task-title-preview': TaskTitlePreview,
    'lr-string-array': StringArrayInput,
    'lr-tag-filter-selector': TagsSelector,
    'lr-source-selector': SourceSelector,
  };

  return (
    <CreatorWizardContext.Provider value={context}>
      <Tabs
        activeKey={viewMode}
        onSelect={(_, eventKey) => handleViewModeChange(eventKey as ViewMode)}
        aria-label="Creator view mode"
        className="pf-v6-u-mb-md"
      >
        <Tab
          eventKey="wizard"
          title={<TabTitleText>Wizard</TabTitleText>}
          tabContentId="wizard-tab"
        />
        <Tab
          eventKey="creator"
          title={<TabTitleText>Creator (YAML)</TabTitleText>}
          tabContentId="creator-tab"
        />
      </Tabs>

      {viewMode === 'wizard' ? (
        <FormRenderer
          onSubmit={() => {}}
          schema={schema}
          initialValues={initialValues}
          componentMapper={componentMapper}
        >
          {({ formFields }) => (
            <form
              onSubmit={(e) => e.preventDefault()}
              className="pf-v6-c-form lrn-creator-form"
            >
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
                    onChangeTags={onChangeTags}
                    onChangeBundles={onChangeBundles}
                    onChangeQuickStartSpec={onChangeQuickStartSpec}
                    onChangeMetadataName={onChangeMetadataName}
                  />
                )}
              </FormSpy>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Fragment>{formFields as any}</Fragment>
            </form>
          )}
        </FormRenderer>
      ) : (
        <CreatorYAMLView
          onChangeQuickStartSpec={onChangeQuickStartSpec}
          onChangeBundles={onChangeBundles}
          onChangeTags={onChangeTags}
          onChangeMetadataTags={onChangeMetadataTags}
          onChangeMetadataName={onChangeMetadataName}
          onChangeKind={onChangeKindDirect}
          quickStart={quickStart}
          currentBundles={currentBundles}
          currentTags={currentTags}
          filterData={filterData}
          bundles={availableBundles}
        />
      )}
    </CreatorWizardContext.Provider>
  );
};

export default CreatorWizard;
