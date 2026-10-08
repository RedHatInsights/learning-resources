import {
  AllQuickStartStates,
  QuickStartContext,
  QuickStartDrawer,
  QuickStartStatus,
  getDefaultQuickStartState,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CreatorWizardStage, ItemMeta } from './meta';
import './CreatorPreview.scss';
import GlobalLearningResourcesQuickstartItem from '../GlobalLearningResourcesPage/GlobalLearningResourcesQuickstartItem';
import findQuickstartFilterTags from '../../utils/findQuickstartFilterTags';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import { FilterMap } from '../../utils/filtersInterface';

const sameStage = (a: CreatorWizardStage, b: CreatorWizardStage) =>
  a.type === b.type &&
  (a.type !== 'task' || (b.type === 'task' && a.index === b.index));

const CreatorPreview = ({
  kindMeta,
  quickStart,
  currentStage,
  filterMap,
  fullWidth = false,
  showTitle = true,
  onStageChange,
}: {
  kindMeta: ItemMeta | null;
  quickStart: ExtendedQuickstart;
  currentStage: CreatorWizardStage;
  filterMap: FilterMap;
  /** Let the quick start panel fill the preview instead of docking beside it. */
  fullWidth?: boolean;
  showTitle?: boolean;
  /**
   * Reports where the author navigated inside the panel (Start, Next, Back,
   * a task link), so a stage picker can follow along. A task index equal to
   * the task count is the closing summary.
   */
  onStageChange?: (stage: CreatorWizardStage) => void;
}) => {
  const allQuickStarts = useMemo(() => [quickStart], [quickStart]);
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  // Null so the first render applies the stage too: a preview that mounts on
  // a task (after a layout switch, say) must open on that task.
  const [prevStage, setPrevStage] = useState<typeof currentStage | null>(null);
  // The stage this preview last reported. When it comes back as the current
  // stage it already matches the panel, and re-applying it would undo the
  // navigation (restarting from the overview resets progress).
  const reportedStage = useRef<CreatorWizardStage | null>(null);

  const parentContext = useContext(QuickStartContext);

  const showPanel =
    kindMeta?.hasTasks &&
    (currentStage.type === 'panel-overview' || currentStage.type === 'task');

  const quickstartValues = useValuesForQuickStartContext({
    allQuickStarts: [quickStart],
    activeQuickStartID: showPanel ? quickStart.metadata.name : '',
    setActiveQuickStartID: () => {},
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: (states) => setQuickStartStates(states),
    useQueryParams: false,
    footer: parentContext.footer,
    focusOnQuickStart: false,
  });

  if (quickstartValues.allQuickStarts?.[0] !== quickStart) {
    quickstartValues.setAllQuickStarts?.([quickStart]);
  }

  const name = quickStart.metadata.name;
  const totalTasks = quickStart.spec.tasks?.length ?? 0;

  if (prevStage !== currentStage) {
    setPrevStage(currentStage);

    const reported = reportedStage.current;
    reportedStage.current = null;
    if (reported && sameStage(currentStage, reported)) {
      // Already showing; see reportedStage.
    } else if (currentStage.type === 'panel-overview') {
      quickstartValues.restartQuickStart?.(
        quickStart.metadata.name,
        quickStart.spec.tasks?.length ?? 0
      );
    } else if (currentStage.type === 'task') {
      // Jumping to a task needs a state to update; without one the library
      // dereferences undefined and the panel crashes.
      setQuickStartStates((states) =>
        states[name]
          ? states
          : {
              ...states,
              [name]: getDefaultQuickStartState(
                totalTasks,
                QuickStartStatus.IN_PROGRESS
              ),
            }
      );
      quickstartValues.setQuickStartTaskNumber?.(
        quickStart.metadata.name,
        currentStage.index
      );
    }
  }

  const taskNumber = quickStartStates[name]?.taskNumber;
  const onStageChangeRef = useRef(onStageChange);
  onStageChangeRef.current = onStageChange;
  useEffect(() => {
    if (!showPanel || typeof taskNumber !== 'number') return;
    const stage: CreatorWizardStage =
      taskNumber < 0
        ? { type: 'panel-overview' }
        : { type: 'task', index: taskNumber };
    if (sameStage(stage, currentStage) || !onStageChangeRef.current) return;
    reportedStage.current = stage;
    onStageChangeRef.current(stage);
  }, [taskNumber]);

  const quickStartTags = findQuickstartFilterTags(filterMap, quickStart);
  return (
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapNone' }}
      className="pf-v6-u-h-100"
    >
      {showTitle && (
        <FlexItem>
          <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-md">
            Live {showPanel ? kindMeta.displayName : 'card'} preview
          </Title>
        </FlexItem>
      )}

      <FlexItem grow={{ default: 'grow' }}>
        <QuickStartContext.Provider value={quickstartValues}>
          <QuickStartDrawer quickStarts={allQuickStarts} fullWidth={fullWidth}>
            <section>
              {!showPanel ? (
                <div className="rc-tile-preview-wrapper">
                  <GlobalLearningResourcesQuickstartItem
                    quickStart={quickStart}
                    // we do not reload any data in creator
                    purgeCache={() => {}}
                    quickStartTags={quickStartTags}
                  />
                </div>
              ) : null}
            </section>
          </QuickStartDrawer>
        </QuickStartContext.Provider>
      </FlexItem>
    </Flex>
  );
};

export default CreatorPreview;
