import {
  AllQuickStartStates,
  QuickStart,
  QuickStartContext,
  QuickStartDrawer,
  QuickStartStatus,
  useValuesForQuickStartContext,
} from '@patternfly/quickstarts';
import { Title } from '@patternfly/react-core';
import WrappedQuickStartTile from '../WrappedQuickStartTile';
import React, { useContext, useMemo, useState } from 'react';
import { ItemMeta } from './meta';

const CreatorPreview = ({
  typeMeta,
  quickStart,
  currentTask,
}: {
  typeMeta: ItemMeta | null;
  quickStart: QuickStart;
  currentTask: number | null;
}) => {
  const allQuickStarts = useMemo(() => [quickStart], [quickStart]);
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );
  const [quickStartId, setQuickStartId] = useState<string>('');

  const parentContext = useContext(QuickStartContext);

  const quickstartValues = useValuesForQuickStartContext({
    allQuickStarts: [quickStart],
    activeQuickStartID: quickStartId,
    setActiveQuickStartID: setQuickStartId,
    allQuickStartStates: quickStartStates,
    setAllQuickStartStates: (states) => setQuickStartStates(states),
    useQueryParams: false,
    footer: parentContext.footer,
    focusOnQuickStart: false,
  });

  if (quickstartValues.allQuickStarts?.[0] !== quickStart) {
    quickstartValues.setAllQuickStarts?.([quickStart]);
  }

  return (
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
  );
};

export default CreatorPreview;
