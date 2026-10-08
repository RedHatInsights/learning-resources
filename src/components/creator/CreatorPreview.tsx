import {
  AllQuickStartStates,
  QuickStartContext,
  QuickStartDrawer,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import React, { useContext, useMemo, useState } from 'react';
import { CreatorWizardStage, ItemMeta } from './meta';
import './CreatorPreview.scss';
import GlobalLearningResourcesQuickstartItem from '../GlobalLearningResourcesPage/GlobalLearningResourcesQuickstartItem';
import findQuickstartFilterTags from '../../utils/findQuickstartFilterTags';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import { FilterMap } from '../../utils/filtersInterface';

const CreatorPreview = ({
  kindMeta,
  quickStart,
  currentStage,
  filterMap,
  fullWidth = false,
  showTitle = true,
}: {
  kindMeta: ItemMeta | null;
  quickStart: ExtendedQuickstart;
  currentStage: CreatorWizardStage;
  filterMap: FilterMap;
  /** Let the quick start panel fill the preview instead of docking beside it. */
  fullWidth?: boolean;
  showTitle?: boolean;
}) => {
  const allQuickStarts = useMemo(() => [quickStart], [quickStart]);
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  const [prevStage, setPrevStage] = useState<typeof currentStage | null>(
    currentStage
  );

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

  if (prevStage !== currentStage) {
    setPrevStage(currentStage);

    if (currentStage.type === 'panel-overview') {
      quickstartValues.restartQuickStart?.(
        quickStart.metadata.name,
        quickStart.spec.tasks?.length ?? 0
      );
    } else if (currentStage.type === 'task') {
      quickstartValues.setQuickStartTaskNumber?.(
        quickStart.metadata.name,
        currentStage.index
      );
    }
  }

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
