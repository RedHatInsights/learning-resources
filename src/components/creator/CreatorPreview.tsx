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
}: {
  typeMeta: ItemMeta | null;
  quickStart: QuickStart;
}) => {
  const allQuickStarts = useMemo(() => [quickStart], [quickStart]);
  const [quickStartStates, setQuickStartStates] = useState<AllQuickStartStates>(
    {}
  );

  const parentContext = useContext(QuickStartContext);

  const quickstartValues = useValuesForQuickStartContext({
    allQuickStarts: [quickStart],
    activeQuickStartID:
      typeMeta?.hasTasks === true ? quickStart.metadata.name : '',
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
