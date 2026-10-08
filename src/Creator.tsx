import React, {
  Dispatch,
  Suspense,
  useMemo,
  useReducer,
  useState,
} from 'react';
import YAML from 'yaml';
import {
  Badge,
  Grid,
  GridItem,
  PageGroup,
  PageSection,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { QuickStartSpec } from '@patternfly/quickstarts';
import CreatorWizard, { EMPTY_TASK } from './components/creator/CreatorWizard';
import {
  CreatorWizardStage,
  ItemKind,
  metaForKind,
} from './components/creator/meta';
import CreatorPreview from './components/creator/CreatorPreview';
import MultiEditWorkspace from './components/creator/multi-edit/MultiEditWorkspace';
import {
  WorkspaceAction,
  WorkspaceState,
  dirtyResources,
  emptyWorkspace,
  workspaceReducer,
} from './components/creator/multi-edit/workspace';
import './Creator.scss';
import useSuspenseLoader, {
  UnwrappedLoader,
} from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader/useSuspenseLoader';
import fetchFilters from './utils/fetchFilters';
import { ExtendedQuickstart } from './utils/fetchQuickstarts';
import useFilterMap from './hooks/useFilterMap';
import { useFlag } from '@unleash/proxy-client-react';

function slugFromTitle(displayName: string): string {
  return displayName
    .toLowerCase()
    .replaceAll(/\s/g, '-')
    .replaceAll(/(^-+)|(-+$)/g, '');
}

function makeDemoQuickStart(
  kind: ItemKind | null,
  baseQuickStart: ExtendedQuickstart
): ExtendedQuickstart {
  const kindMeta = kind !== null ? metaForKind(kind) : null;

  return {
    ...baseQuickStart,
    metadata: {
      ...baseQuickStart.metadata,
      ...(kindMeta?.extraMetadata ?? {}),
    },
  };
}

type CreatorMode = 'single' | 'multi';

const CreatorInternal = ({
  resetCreator,
  filterLoader,
  mode,
  setMode,
  workspace,
  dispatchWorkspace,
}: {
  resetCreator: () => void;
  filterLoader: UnwrappedLoader<typeof fetchFilters>;
  mode: CreatorMode;
  setMode: (mode: CreatorMode) => void;
  workspace: WorkspaceState;
  dispatchWorkspace: Dispatch<WorkspaceAction>;
}) => {
  const { data: filterData } = filterLoader();
  const showGitService = useFlag(
    'platform.learning-resources.quickstarts.git-service'
  );
  // Batch editing saves through the git-service batch API, so it needs both.
  const showMultiEdit =
    useFlag('platform.learning-resources.quickstarts.multi-edit') &&
    showGitService;
  const [rawKind, setRawKind] = useState<ItemKind | null>(null);
  const filterMap = useFilterMap({ data: filterData });
  const isMulti = showMultiEdit && mode === 'multi';
  // Shown on the mode switch, so leaving the batch editor never hides work.
  const unsavedInMulti = dirtyResources(workspace).length;

  const [rawQuickStart, setRawQuickStart] = useState<ExtendedQuickstart>({
    apiVersion: 'console.openshift.io/v1',
    metadata: {
      // Empty until a document supplies one (hydrate or the YAML editor).
      // Until then the slug is derived from the title, see `effectiveName`.
      name: '',
      tags: [],
    },
    spec: {
      version: 0.1,
      displayName: '',
      icon: null,
      description: '',
    },
  });

  const selectedKind =
    rawKind !== null ? { id: rawKind, meta: metaForKind(rawKind) } : null;

  const [bundles, setBundles] = useState<string[]>([]);
  const [tags, setTags] = useState<{ [kind: string]: string[] }>({});
  const [currentStage, setCurrentStage] = useState<CreatorWizardStage>({
    type: 'card',
  });

  const isDownloadStage = currentStage.type !== 'download';

  const updateSpec = (
    updater: (old: QuickStartSpec) => Partial<QuickStartSpec>
  ) => {
    setRawQuickStart((old) => ({
      ...old,
      spec: {
        ...old.spec,
        ...updater(old.spec),
      },
    }));
  };

  const updateMetadataName = (name: string) => {
    setRawQuickStart((old) => ({
      ...old,
      metadata: {
        ...old.metadata,
        name,
      },
    }));
  };

  const updateMetadataTags = (tags: Array<{ kind: string; value: string }>) => {
    setRawQuickStart((old) => ({
      ...old,
      metadata: {
        ...old.metadata,
        tags,
      },
    }));
  };

  const setKind = (newKind: ItemKind | null) => {
    if (newKind !== null) {
      const meta = metaForKind(newKind);

      setRawQuickStart((old) => {
        const updates: Partial<ExtendedQuickstart> = {};

        updates.spec = { ...old.spec };

        updates.spec.type = {
          text: meta.displayName,
          color: meta.tagColor,
        };

        if (
          meta.hasTasks &&
          (old.spec.tasks === undefined || old.spec.tasks.length === 0)
        ) {
          updates.spec.tasks = [EMPTY_TASK];
        }

        if (!meta.hasTasks) {
          updates.spec.tasks = undefined;
          updates.spec.introduction = undefined;
          updates.spec.prerequisites = [];
        }

        if (!meta.fields.url) updates.spec.link = undefined;
        if (!meta.fields.duration) updates.spec.durationMinutes = undefined;

        const allTags = bundles.toSorted().map((bundle) => ({
          kind: 'bundle',
          value: bundle,
        }));
        Object.entries(tags).forEach(([kind, values]) => {
          values.forEach((value) => {
            allTags.push({ kind, value });
          });
        });
        updates.metadata = {
          name: old.metadata.name,
          tags: allTags,
          ...meta.extraMetadata,
        };

        return { ...old, ...updates };
      });
    }

    setRawKind(newKind);
  };

  // `metadata.name` is the resource's identity on disk: it names the content
  // file and `docs/quickstarts/<name>/`. Once a document supplies one — loading
  // a live doc, continuing an open PR, or typing it in the YAML editor — it
  // wins, so retitling does not rename the directory of something that already
  // exists on GitHub. A brand-new resource has no identity to preserve yet, so
  // its slug keeps tracking the title until one is set.
  const effectiveName = useMemo(
    () =>
      rawQuickStart.metadata.name?.trim() ||
      slugFromTitle(rawQuickStart.spec.displayName),
    [rawQuickStart.metadata.name, rawQuickStart.spec.displayName]
  );

  const quickStart = useMemo(() => {
    const demo = makeDemoQuickStart(rawKind, rawQuickStart);
    if (!showGitService) {
      return { ...demo, metadata: { ...demo.metadata, name: effectiveName } };
    }

    const allTags = bundles.toSorted().map((bundle) => ({
      kind: 'bundle',
      value: bundle,
    }));
    Object.entries(tags).forEach(([kind, values]) => {
      values.forEach((value) => {
        allTags.push({ kind, value });
      });
    });
    return {
      ...demo,
      metadata: {
        ...demo.metadata,
        name: effectiveName,
        tags: allTags,
      },
    };
  }, [rawKind, rawQuickStart, bundles, tags, showGitService, effectiveName]);

  const files = useMemo(() => {
    const adjustedQuickstart = {
      apiVersion: quickStart.apiVersion || 'console.openshift.io/v1',
      kind: 'QuickStarts',
      metadata: quickStart.metadata,
      spec: {
        version: quickStart.spec.version ?? 0.1,
        ...quickStart.spec,
        icon: quickStart.spec.icon ?? null,
      },
    };

    const allTags = bundles.toSorted().map((bundle) => ({
      kind: 'bundle',
      value: bundle,
    }));
    Object.entries(tags).forEach(([kind, values]) => {
      values.forEach((value) => {
        allTags.push({ kind, value });
      });
    });

    return [
      {
        name: 'metadata.yaml',
        content: YAML.stringify({
          kind: 'QuickStarts',
          name: effectiveName,
          tags: allTags,
        }),
      },
      {
        name: `${effectiveName}.yaml`,
        content: YAML.stringify(adjustedQuickstart, { nullStr: '~' }),
      },
    ];
  }, [quickStart, bundles, tags, effectiveName]);

  return (
    <PageGroup>
      <PageSection hasBodyWrapper={false} className="rc-header">
        <Title headingLevel="h1" size="2xl">
          {isMulti ? 'Edit learning resources' : 'Add new learning resource'}
        </Title>

        <p>
          Add cards to the learning resources spaces within console.redhat.com.{' '}
          <a
            href="https://docs.google.com/presentation/d/1FiwBc_VuCxvobv80suXww0eKEs381MgR1WK6q7_DynY/edit#slide=id.g1b95fa54a9f_0_801"
            target="_blank"
            rel="noreferrer"
          >
            Learn more about Hybrid Cloud Console Learning Resources.
          </a>
        </p>

        {showMultiEdit && (
          <ToggleGroup aria-label="Creator mode" className="pf-v6-u-mt-md">
            <ToggleGroupItem
              text="Single resource"
              buttonId="creator-mode-single"
              isSelected={mode === 'single'}
              onChange={() => setMode('single')}
            />
            <ToggleGroupItem
              text={
                <>
                  Edit multiple resources
                  {unsavedInMulti > 0 && (
                    <Badge
                      className="pf-v6-u-ml-sm"
                      screenReaderText="unsaved resources"
                    >
                      {unsavedInMulti}
                    </Badge>
                  )}
                </>
              }
              buttonId="creator-mode-multi"
              isSelected={mode === 'multi'}
              onChange={() => setMode('multi')}
            />
          </ToggleGroup>
        )}
      </PageSection>

      {isMulti ? (
        <PageSection hasBodyWrapper={false} isFilled>
          <MultiEditWorkspace
            filterMap={filterMap}
            state={workspace}
            dispatch={dispatchWorkspace}
          />
        </PageSection>
      ) : (
        <PageSection
          hasBodyWrapper={false}
          isFilled
          padding={{ default: 'noPadding' }}
        >
          <Grid hasGutter className="pf-v6-u-h-100 pf-v6-u-w-100">
            <GridItem span={12} lg={isDownloadStage ? 6 : 12}>
              <CreatorWizard
                onChangeTags={setTags}
                onChangeKind={setKind}
                onChangeQuickStartSpec={(spec) => {
                  updateSpec(() => spec);
                }}
                onChangeMetadataTags={updateMetadataTags}
                onChangeMetadataName={
                  showGitService ? updateMetadataName : undefined
                }
                filterData={filterData}
                onChangeBundles={setBundles}
                onChangeCurrentStage={setCurrentStage}
                resetCreator={resetCreator}
                files={files}
                quickStart={quickStart}
                currentBundles={bundles}
                currentTags={tags}
                currentKind={rawKind}
                onChangeKindDirect={setRawKind}
              />
            </GridItem>

            {isDownloadStage ? (
              <GridItem span={12} lg={6} className="pf-v6-u-pt-md-on-lg">
                <CreatorPreview
                  kindMeta={selectedKind?.meta ?? null}
                  quickStart={quickStart}
                  currentStage={currentStage}
                  filterMap={filterMap}
                />
              </GridItem>
            ) : null}
          </Grid>
        </PageSection>
      )}
    </PageGroup>
  );
};

const Creator = () => {
  const { loader } = useSuspenseLoader(fetchFilters);
  const [resetCount, setResetCount] = useState(0n);
  // The batch workspace and mode live above the reset key: resetting the
  // single-resource creator, or switching modes, must not drop batch work.
  const [mode, setMode] = useState<CreatorMode>('single');
  const [workspace, dispatchWorkspace] = useReducer(
    workspaceReducer,
    undefined,
    emptyWorkspace
  );

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatorInternal
        filterLoader={loader}
        key={resetCount}
        resetCreator={() => setResetCount((old) => old + 1n)}
        mode={mode}
        setMode={setMode}
        workspace={workspace}
        dispatchWorkspace={dispatchWorkspace}
      />
    </Suspense>
  );
};

export default Creator;
