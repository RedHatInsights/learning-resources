import React, { useEffect, useMemo, useState } from 'react';
import {
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

function makeDemoQuickStart(state: CreatorWizardState): QuickStart {
  const selectedTypeMeta =
    state.type !== null ? itemKindMeta[state.type] : null;

  return {
    metadata: {
      name: 'test-quickstart',
      kind: 'QuickStarts',
    },
    spec: {
      displayName: state.title,
      icon: null,
      description: state.description,
      introduction:
        selectedTypeMeta?.hasTasks === true ? state.introduction : undefined,
      // prerequisites:
      //   selectedTypeMeta?.hasTasks === true ? state.prerequisites : undefined,
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
          ? state.tasks.map((task) => ({
              title: task.title,
              description: task.description,
            }))
          : undefined,
    },
  };
}

const Creator = () => {
  const [state, setState] = useState<CreatorWizardState>({
    type: null,
    title: '',
    description: '',
    bundles: [],
    url: '',
    duration: 0,
    tasks: [EMPTY_TASK],
    introduction: '',
    prerequisites: '',
  });

  const selectedType = useMemo(() => {
    if (state.type === null) {
      return null;
    }

    return { id: state.type, meta: itemKindMeta[state.type] };
  }, [state.type]);

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

  const quickstartValues = useValuesForQuickStartContext({
    allQuickStarts: allQuickStarts,
    activeQuickStartID: activeQuickStart,
    setActiveQuickStartID: (id) => setActiveQuickStart(id),
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: (states) => setQuickStartStates(states),
    useQueryParams: false,
  });

  useEffect(() => {
    quickstartValues.setAllQuickStarts?.(allQuickStarts);
  }, [allQuickStarts]);

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
              value={state}
              onChange={(newValue) => setState(newValue)}
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
