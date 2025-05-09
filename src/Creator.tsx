import React, { Suspense, useMemo, useState } from 'react';
import YAML from 'yaml';
import {
  Grid,
  GridItem,
  PageGroup,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { QuickStartSpec } from '@patternfly/quickstarts';
import CreatorWizard, { EMPTY_TASK } from './components/creator/CreatorWizard';
import {
  CreatorWizardStage,
  ItemKind,
  metaForKind,
} from './components/creator/meta';
import CreatorPreview from './components/creator/CreatorPreview';
import './Creator.scss';
import useSuspenseLoader, {
  UnwrappedLoader,
} from '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader/useSuspenseLoader';
import fetchFilters from './utils/fetchFilters';
import { ExtendedQuickstart } from './utils/fetchQuickstarts';
import useFilterMap from './hooks/useFilterMap';

const BASE_METADATA = {
  name: 'test-quickstart',
};

function makeDemoQuickStart(
  kind: ItemKind | null,
  baseQuickStart: ExtendedQuickstart
): ExtendedQuickstart {
  const kindMeta = kind !== null ? metaForKind(kind) : null;

  return {
    ...baseQuickStart,
    metadata: {
      ...baseQuickStart.metadata,
      name: 'test-quickstart',
      ...(kindMeta?.extraMetadata ?? {}),
    },
  };
}

const CreatorInternal = ({
  resetCreator,
  filterLoader,
}: {
  resetCreator: () => void;
  filterLoader: UnwrappedLoader<typeof fetchFilters>;
}) => {
  const { data: filterData } = filterLoader();
  const [rawKind, setRawKind] = useState<ItemKind | null>(null);
  const filterMap = useFilterMap({ data: filterData });

  const [rawQuickStart, setRawQuickStart] = useState<ExtendedQuickstart>({
    metadata: {
      name: 'test-quickstart',
      tags: [],
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
          tags: allTags,
          ...BASE_METADATA,
          ...meta.extraMetadata,
        };

        return { ...old, ...updates };
      });
    }

    setRawKind(newKind);
  };

  const quickStart = useMemo(
    () => makeDemoQuickStart(rawKind, rawQuickStart),
    [rawKind, rawQuickStart]
  );

  const files = useMemo(() => {
    const effectiveName = quickStart.spec.displayName
      .toLowerCase()
      .replaceAll(/\s/g, '-')
      .replaceAll(/(^-+)|(-+$)/g, '');

    const adjustedQuickstart = {
      ...quickStart,
      spec: {
        ...quickStart.spec,
        icon: undefined,
      },
      metadata: {
        ...quickStart.metadata,
        name: effectiveName,
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
        content: YAML.stringify(adjustedQuickstart),
      },
    ];
  }, [quickStart, bundles, tags]);

  return (
    <PageGroup>
      <PageSection hasBodyWrapper={false} className="rc-header">
        <Title headingLevel="h1" size="2xl">
          Add new learning resource
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
      </PageSection>

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
              filterData={filterData}
              onChangeBundles={setBundles}
              onChangeCurrentStage={setCurrentStage}
              resetCreator={resetCreator}
              files={files}
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
    </PageGroup>
  );
};

const Creator = () => {
  const { loader } = useSuspenseLoader(fetchFilters);
  const [resetCount, setResetCount] = useState(0n);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatorInternal
        filterLoader={loader}
        key={resetCount}
        resetCreator={() => setResetCount((old) => old + 1n)}
      />
    </Suspense>
  );
};

export default Creator;
