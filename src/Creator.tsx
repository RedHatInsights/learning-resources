import React, { useMemo, useState } from 'react';
import YAML, { YAMLError } from 'yaml';
import {
  Grid,
  GridItem,
  PageGroup,
  PageSection,
  Title,
} from '@patternfly/react-core';
import {
  QuickStart,
  QuickStartSpec,
  QuickStartTask,
} from '@patternfly/quickstarts';
import CreatorWizard, { EMPTY_TASK } from './components/creator/CreatorWizard';
import { ItemKind, metaForKind } from './components/creator/meta';
import CreatorPreview from './components/creator/CreatorPreview';

export type CreatorErrors = {
  taskErrors: Map<number, string>;
};

const BASE_METADATA = {
  name: 'test-quickstart',
};

function makeDemoQuickStart(
  kind: ItemKind | null,
  baseQuickStart: QuickStart,
  taskContents: string[]
): [QuickStart, CreatorErrors] {
  const kindMeta = kind !== null ? metaForKind(kind) : null;

  const [tasks, taskErrors] = (() => {
    if (kindMeta?.hasTasks !== true) return [undefined, new Map()];

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
        ...(kindMeta?.extraMetadata ?? {}),
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
  const [rawKind, setRawKind] = useState<ItemKind | null>(null);

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

  const selectedKind =
    rawKind !== null ? { id: rawKind, meta: metaForKind(rawKind) } : null;

  const [bundles, setBundles] = useState<string[]>([]);
  const [taskContents, setTaskContents] = useState<string[]>([]);

  const [currentTask, setCurrentTask] = useState<number | null>(null);

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

  const setKind = (newKind: ItemKind | null) => {
    if (newKind !== null) {
      const meta = metaForKind(newKind);

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

    setRawKind(newKind);
  };

  const [quickStart, errors] = useMemo(
    () => makeDemoQuickStart(rawKind, rawQuickStart, taskContents),
    [rawKind, rawQuickStart, taskContents]
  );

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
          tags: bundles
            .toSorted()
            .map((bundle) => ({ kind: 'bundle', value: bundle })),
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
        <Title headingLevel="h1" size="2xl">
          Add new learning resources
        </Title>

        <p>Description</p>
      </PageSection>

      <PageSection isFilled>
        <Grid hasGutter className="pf-v5-u-h-100 pf-v5-u-w-100">
          <GridItem span={12} lg={6}>
            <CreatorWizard
              onChangeKind={setKind}
              onChangeQuickStartSpec={(spec) => {
                updateSpec(() => spec);
              }}
              onChangeBundles={setBundles}
              onChangeTaskContents={setTaskContents}
              onChangeCurrentTask={setCurrentTask}
              errors={errors}
              files={files}
            />
          </GridItem>

          <GridItem span={12} lg={6}>
            <CreatorPreview
              kindMeta={selectedKind?.meta ?? null}
              quickStart={quickStart}
              currentTask={currentTask}
            />
          </GridItem>
        </Grid>
      </PageSection>
    </PageGroup>
  );
};

export default Creator;
