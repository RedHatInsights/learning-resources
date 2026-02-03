import { useCallback, useMemo, useState } from 'react';
import {
  AllQuickStartStates,
  ScopedControllerOptions,
  ScopedQuickStartController,
} from '../types/quickstarts';
import { useQuickstartsStore } from '../stores/quickstartsStore';

/**
 * Hook for creating a scoped QuickStart controller with isolated or synced state.
 * Use this when you need to render QuickStarts outside Chrome's managed drawer,
 * such as in a HelpPanel tab or custom UI component.
 *
 * @param options - Configuration options for the scoped controller
 * @returns A ScopedQuickStartController with isolated or synced state management
 *
 * @example
 * ```tsx
 * // Isolated mode (default) - state is local to this component
 * const controller = useScopedQuickStart({ quickStarts: myQuickStarts });
 *
 * // Synced mode - progress shared with global store and persisted to API
 * const controller = useScopedQuickStart({
 *   quickStarts: myQuickStarts,
 *   syncWithStore: true
 * });
 *
 * // Activate a specific QuickStart
 * controller.setActiveQuickStartID('my-quickstart-name');
 *
 * // Render the QuickStart content in your custom UI
 * if (controller.activeQuickStart) {
 *   return <QuickStartPanelContent quickStart={controller.activeQuickStart} ... />;
 * }
 * ```
 */
const useScopedQuickStart = (
  options: ScopedControllerOptions = {}
): ScopedQuickStartController => {
  const { quickStarts = [], syncWithStore = false } = options;

  // Always call the store hook to follow rules of hooks
  const store = useQuickstartsStore();

  // Local state for isolated mode
  const [localAllQuickStartStates, setLocalAllQuickStartStates] =
    useState<AllQuickStartStates>({});

  // Active ID is always local (so scoped quickstarts don't open the global drawer)
  const [activeQuickStartID, setActiveQuickStartIDInternal] =
    useState<string>('');

  const setActiveQuickStartID = useCallback((id: string) => {
    setActiveQuickStartIDInternal(id);
  }, []);

  // Use store or local state based on syncWithStore option
  const allQuickStartStates = syncWithStore
    ? store.allQuickStartStates
    : localAllQuickStartStates;

  // Create a unified setter that works for both modes
  const setAllQuickStartStates = useCallback(
    (
      statesOrUpdater:
        | AllQuickStartStates
        | ((prev: AllQuickStartStates) => AllQuickStartStates)
    ) => {
      if (syncWithStore) {
        // Store expects the full state object, not a setter function
        const newStates =
          typeof statesOrUpdater === 'function'
            ? statesOrUpdater(store.allQuickStartStates)
            : statesOrUpdater;
        store.setAllQuickStartStates(newStates);
      } else {
        setLocalAllQuickStartStates(statesOrUpdater);
      }
    },
    [syncWithStore, store]
  );

  const activeQuickStart = useMemo(() => {
    if (!activeQuickStartID) {
      return null;
    }
    return (
      quickStarts.find((qs) => qs.metadata.name === activeQuickStartID) || null
    );
  }, [activeQuickStartID, quickStarts]);

  const restartQuickStart = useCallback(() => {
    if (!activeQuickStartID) {
      return;
    }

    setAllQuickStartStates((prevStates) => ({
      ...prevStates,
      [activeQuickStartID]: {
        ...(prevStates[activeQuickStartID] || {}),
        taskNumber: 0,
        status: 'In Progress',
      } as AllQuickStartStates[string],
    }));
  }, [activeQuickStartID, setAllQuickStartStates]);

  const controller: ScopedQuickStartController = useMemo(
    () => ({
      activeQuickStart,
      activeQuickStartID,
      allQuickStartStates,
      setActiveQuickStartID,
      setAllQuickStartStates,
      restartQuickStart,
    }),
    [
      activeQuickStart,
      activeQuickStartID,
      allQuickStartStates,
      setActiveQuickStartID,
      setAllQuickStartStates,
      restartQuickStart,
    ]
  );

  return controller;
};

export default useScopedQuickStart;
