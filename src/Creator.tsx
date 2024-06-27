import React, { useContext, useEffect, useMemo, useState } from 'react';
import YAML from 'yaml';
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
  QuickStartStatus,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import WrappedQuickStartTile from './components/WrappedQuickStartTile';
import CreatorWizard, {
  CreatorWizardState,
  EMPTY_TASK,
} from './components/creator/CreatorWizard';
import { itemKindMeta } from './components/creator/meta';
import { AppContext } from './AppContext';

function makeDemoQuickStart(state: CreatorWizardState): QuickStart {
  const selectedTypeMeta =
    state.type !== null ? itemKindMeta[state.type] : null;

  return {
    metadata: {
      name: 'test-quickstart',
      kind: 'QuickStarts',
      ...(selectedTypeMeta?.extraMetadata ?? {}),
    },
    spec: {
      displayName: state.title,
      icon: null,
      description: state.description,
      introduction:
        selectedTypeMeta?.hasTasks === true ? state.introduction : undefined,
      prerequisites:
        selectedTypeMeta?.hasTasks === true ? state.prerequisites : undefined,
      link:
        selectedTypeMeta?.fields?.url === true
          ? {
              href: state.url,
              text: 'View documentation',
            }
          : undefined,
      type:
        selectedTypeMeta !== null
          ? {
              text: selectedTypeMeta.displayName,
              color: selectedTypeMeta.tagColor,
            }
          : undefined,
      durationMinutes:
        selectedTypeMeta?.fields?.duration === true && state.duration > 0
          ? state.duration
          : undefined,
      tasks:
        selectedTypeMeta?.hasTasks === true
          ? state.tasks.map((task) => {
              try {
                return {
                  ...YAML.parse(task.yamlContent),
                  title: task.title,
                };
              } catch (e) {
                return {
                  title: task.title,
                  description: 'An error occurred while parsing the task.',
                };
              }
            })
          : undefined,
    },
  };
}

const Creator = () => {
  const { onNavigate } = useContext(AppContext);

  const [state, setState] = useState<CreatorWizardState>({
    type: null,
    title: '',
    description: '',
    bundles: [],
    url: '',
    duration: 0,
    tasks: [EMPTY_TASK],
    introduction: '',
    prerequisites: [],
  });

  const selectedType =
    state.type !== null
      ? { id: state.type, meta: itemKindMeta[state.type] }
      : null;

  const quickStart = useMemo<QuickStart>(
    () => makeDemoQuickStart(state),
    [state]
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
    allQuickStarts: allQuickStarts,
    activeQuickStartID: activeQuickStart,
    setActiveQuickStartID: (id) => setActiveQuickStart(id),
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: (states) => setQuickStartStates(states),
    useQueryParams: false,
    footer: parentContext.footer,
    focusOnQuickStart: false,
  });

  useEffect(() => {
    quickstartValues.setAllQuickStarts?.(allQuickStarts);
  }, [allQuickStarts]);

  const files = useMemo(() => {
    const effectiveName = quickStart.spec.displayName
      .toLowerCase()
      .replaceAll(/[^a-z0-9]/g, '-')
      .replaceAll(/(^-+)|(-+$)/g, '');

    const adjustedQuickstart = { ...quickStart };
    adjustedQuickstart.spec = { ...adjustedQuickstart.spec };

    delete adjustedQuickstart.spec['icon'];

    return [
      {
        name: 'metadata.yaml',
        content: YAML.stringify({
          kind: 'QuickStarts',
          name: effectiveName,
          tags: [
            state.bundles
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
  }, [quickStart, state]);

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
            <CreatorWizard value={state} onChange={setState} files={files} />
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
