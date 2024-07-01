import React, { useContext, useMemo, useState } from 'react';
import YAML, { YAMLError } from 'yaml';
import {
  Button,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageGroup,
  PageSection,
  Title,
} from '@patternfly/react-core';
import './Creator.scss';
import './components/CatalogSection.scss';
import {
  AllQuickStartStates,
  QuickStart,
  QuickStartContext,
  QuickStartDrawer,
  QuickStartSpec,
  QuickStartStatus,
  QuickStartTask,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import WrappedQuickStartTile from './components/WrappedQuickStartTile';
import CreatorWizard, { EMPTY_TASK } from './components/creator/CreatorWizard';
import { ItemKind, itemKindMeta } from './components/creator/meta';
import { AppContext } from './AppContext';

export type CreatorErrors = {
  taskErrors: Map<number, string>;
};

const BASE_METADATA = {
  name: 'test-quickstart',
};

function makeDemoQuickStart(
  type: ItemKind | null,
  baseQuickStart: QuickStart,
  taskContents: string[]
): [QuickStart, CreatorErrors] {
  const selectedTypeMeta = type !== null ? itemKindMeta[type] : null;

  const [tasks, taskErrors] = (() => {
    if (selectedTypeMeta?.hasTasks !== true) return [undefined, new Map()];

    const out: QuickStartTask[] = [];
    const errors: CreatorErrors['taskErrors'] = new Map();

    if (baseQuickStart.spec.tasks !== undefined) {
      for (let index = 0; index < baseQuickStart.spec.tasks.length; ++index) {
        const task = baseQuickStart.spec.tasks[index];

        try {
          out.push({
            ...YAML.parse(taskContents[index]),
            title: task.title,
          });
        } catch (e) {
          if (!(e instanceof YAMLError)) throw e;

          out.push({ ...EMPTY_TASK, title: task.title });
          errors.set(index, e.message);
        }
      }
    }

    return [out, errors];
  })();

  return [
    {
      ...baseQuickStart,
      metadata: {
        ...baseQuickStart.metadata,
        name: 'test-quickstart',
        ...(selectedTypeMeta?.extraMetadata ?? {}),
      },
      spec: {
        ...baseQuickStart.spec,
        tasks: tasks,
      },
    },
    { taskErrors },
  ];
}

const Creator = () => {
  const { onNavigate } = useContext(AppContext);

  const [rawType, setRawType] = useState<ItemKind | null>(null);

  const [rawQuickStart, setRawQuickStart] = useState<QuickStart>({
    metadata: {
      name: 'test-quickstart',
    },
    spec: {
      displayName: '',
      icon: null,
      description: '',
    },
  });

  const selectedType =
    rawType !== null ? { id: rawType, meta: itemKindMeta[rawType] } : null;

  const [bundles, setBundles] = useState<string[]>([]);
  const [taskContents, setTaskContents] = useState<string[]>([]);

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

  const setType = (newType: ItemKind | null) => {
    if (newType !== null) {
      const meta = itemKindMeta[newType];

      setRawQuickStart((old) => {
        const updates: Partial<QuickStart> = {};

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

        updates.metadata = { ...BASE_METADATA, ...meta.extraMetadata };

        return { ...old, ...updates };
      });

      if (meta.hasTasks) {
        setTaskContents((old) => (old.length === 0 ? [''] : old));
      } else if (!meta.hasTasks) {
        setTaskContents([]);
      }
    }

    setRawType(newType);
  };

  const [quickStart, errors] = useMemo(
    () => makeDemoQuickStart(rawType, rawQuickStart, taskContents),
    [rawType, rawQuickStart, taskContents]
  );

  const allQuickStarts = useMemo(() => [quickStart], [quickStart]);
  const [activeQuickStart, setActiveQuickStart] = useState('');
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  if (selectedType?.meta?.hasTasks !== true && activeQuickStart !== '') {
    setActiveQuickStart('');
  }

  const parentContext = useContext(QuickStartContext);

  const quickstartValues = useValuesForQuickStartContext({
    allQuickStarts: [quickStart],
    activeQuickStartID: activeQuickStart,
    setActiveQuickStartID: (id) => setActiveQuickStart(id),
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: (states) => setQuickStartStates(states),
    useQueryParams: false,
    footer: parentContext.footer,
    focusOnQuickStart: false,
  });

  if (quickstartValues.allQuickStarts?.[0] !== quickStart) {
    quickstartValues.setAllQuickStarts?.([quickStart]);
  }

  const files = useMemo(() => {
    const effectiveName = quickStart.spec.displayName
      .toLowerCase()
      .replaceAll(/\s/g, '-')
      .replaceAll(/(^-+)|(-+$)/g, '');

    const adjustedQuickstart = { ...quickStart };
    adjustedQuickstart.spec = { ...adjustedQuickstart.spec };
    adjustedQuickstart.metadata = {
      ...adjustedQuickstart.metadata,
      name: effectiveName,
    };

    delete adjustedQuickstart.spec['icon'];

    return [
      {
        name: 'metadata.yaml',
        content: YAML.stringify({
          kind: 'QuickStarts',
          name: effectiveName,
          tags: [
            bundles
              .toSorted()
              .map((bundle) => ({ kind: 'bundle', value: bundle })),
          ],
        }),
      },
      {
        name: `${effectiveName}.yaml`,
        content: YAML.stringify(adjustedQuickstart),
      },
    ];
  }, [quickStart, bundles]);

  if ((quickStart.spec.tasks?.length ?? 0) != taskContents.length) {
    throw new Error(
      `Mismatch between quickstart tasks and task contents: ${quickStart.spec.tasks?.length} vs ${taskContents.length}`
    );
  }

  return (
    <PageGroup>
      <PageSection variant="darker">
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Title headingLevel="h1" size="2xl">
              Add new learning resources
            </Title>

            <p>Description</p>
          </FlexItem>

          {onNavigate !== undefined ? (
            <FlexItem>
              <Button variant="primary" onClick={() => onNavigate('viewer')}>
                Viewer
              </Button>
            </FlexItem>
          ) : null}
        </Flex>
      </PageSection>

      <PageSection isFilled>
        <Grid hasGutter className="pf-v5-u-h-100 pf-v5-u-w-100">
          <GridItem span={12} lg={6}>
            <CreatorWizard
              quickStart={rawQuickStart}
              onChangeQuickStartSpec={(spec) => updateSpec(() => spec)}
              type={rawType}
              onChangeType={setType}
              bundles={bundles}
              onChangeBundles={setBundles}
              taskContents={taskContents}
              onChangeTaskContents={setTaskContents}
              onAddTask={() => {
                updateSpec((old) => ({ tasks: (old.tasks ?? []).concat({}) }));
                setTaskContents((old) => old.concat(''));
              }}
              onRemoveTask={(index) => {
                updateSpec((old) => {
                  if (old.tasks === undefined || old.tasks.length <= index)
                    return {};

                  return { tasks: old.tasks.toSpliced(index, 1) };
                });

                setTaskContents((old) => {
                  if (old.length <= index) return old;

                  return old.toSpliced(index, 1);
                });
              }}
              errors={errors}
              files={files}
            />
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
