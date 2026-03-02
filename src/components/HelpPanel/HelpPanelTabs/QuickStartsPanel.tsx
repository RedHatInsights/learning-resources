import {
  Bullseye,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Spinner,
} from '@patternfly/react-core';
import {
  QuickStartContainer,
  QuickStartDrawerContent,
  QuickStartStatus,
} from '@patternfly/quickstarts';
import type { AllQuickStartStates } from '@patternfly/quickstarts';
import type { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';
import React, { useCallback } from 'react';

export interface QuickStartsPanelProps {
  activeQuickStartID: string;
  quickStarts: ExtendedQuickstart[];
  loading: boolean;
  allQuickStartStates: AllQuickStartStates;
  setAllQuickStartStates: React.Dispatch<
    React.SetStateAction<AllQuickStartStates>
  >;
  /** Called when the user closes the drawer; receives quickstart status for modal handling. */
  onClose: (activeQuickStartStatus: string | number) => void;
  /** Optional: call when closing and quickstart is not in progress (e.g. remove tab, clear overlay). */
  onCloseNotInProgress?: () => void;
}

/**
 * Renders a single quickstart in the Help Panel using the PatternFly
 * "Quick starts with custom drawer" pattern: QuickStartContainer (isManagedDrawer=false)
 * wrapping Drawer → DrawerContent (panelContent=QuickStartDrawerContent) → DrawerContentBody.
 * The parent is responsible for the close modal (QuickStartCloseModal) and for removing
 * the tab when the drawer is closed.
 */
const QuickStartsPanel: React.FC<QuickStartsPanelProps> = ({
  activeQuickStartID,
  quickStarts,
  loading,
  allQuickStartStates,
  setAllQuickStartStates,
  onClose,
  onCloseNotInProgress,
}) => {
  // When the user clicks "Close" at the end of the quickstart, PatternFly calls
  // setActiveQuickStartID(''). Intercept that and notify parent to close the tab.
  const setActiveQuickStartID = useCallback(
    (idOrUpdater: React.SetStateAction<string>) => {
      const next =
        typeof idOrUpdater === 'function'
          ? idOrUpdater(activeQuickStartID)
          : idOrUpdater;
      if (next === '') {
        const status =
          allQuickStartStates[activeQuickStartID]?.status ??
          QuickStartStatus.COMPLETE;
        onClose(status);
      }
    },
    [activeQuickStartID, allQuickStartStates, onClose]
  );

  if (loading) {
    return (
      <Bullseye>
        <Spinner size="lg" aria-label="Loading quickstart" />
      </Bullseye>
    );
  }

  if (quickStarts.length === 0) {
    return (
      <Bullseye>
        <span className="pf-v6-u-color-200">
          Unable to load quickstart content.
        </span>
      </Bullseye>
    );
  }

  return (
    <QuickStartContainer
      quickStarts={quickStarts}
      activeQuickStartID={activeQuickStartID}
      setActiveQuickStartID={setActiveQuickStartID}
      allQuickStartStates={allQuickStartStates}
      setAllQuickStartStates={setAllQuickStartStates}
      isManagedDrawer={false}
      useQueryParams={false}
      onCloseNotInProgress={onCloseNotInProgress}
    >
      <Drawer isExpanded isInline className="lr-c-help-panel-quickstart-drawer">
        <DrawerContent
          panelContent={
            <QuickStartDrawerContent fullWidth handleDrawerClose={onClose} />
          }
        >
          <DrawerContentBody />
        </DrawerContent>
      </Drawer>
    </QuickStartContainer>
  );
};

export default QuickStartsPanel;
