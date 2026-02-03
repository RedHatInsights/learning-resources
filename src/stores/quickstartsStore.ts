import { createSharedStore } from '@scalprum/core';
import { useGetState } from '@scalprum/react-core';
import { QuickStart, QuickStartState } from '@patternfly/quickstarts';
import axios from 'axios';

/**
 * State interface for the QuickStarts shared store.
 * This store manages quickstart data, active state, and progress across federated modules.
 */
export interface QuickStartsStoreState {
  /** Quickstarts organized by app/namespace key */
  quickstarts: { [key: string]: QuickStart[] };
  /** Currently active quickstart ID */
  activeQuickStartID: string;
  /** Progress states for all quickstarts */
  allQuickStartStates: { [key: string | number]: QuickStartState };
  /** Account ID for persisting progress */
  accountId: string | undefined;
}

const EVENTS = [
  'SET_QUICKSTARTS',
  'ADD_QUICKSTART',
  'CLEAR_QUICKSTARTS',
  'SET_ACTIVE_QUICKSTART',
  'SET_ALL_STATES',
  'SET_ACCOUNT_ID',
  'INITIALIZE',
] as const;

type QuickStartsEvent = (typeof EVENTS)[number];

interface SetQuickstartsPayload {
  app: string;
  quickstarts: QuickStart[];
}

interface AddQuickstartPayload {
  app: string;
  quickstart: QuickStart;
}

interface ClearQuickstartsPayload {
  activeQuickStartID?: string;
}

type EventPayload = {
  SET_QUICKSTARTS: SetQuickstartsPayload;
  ADD_QUICKSTART: AddQuickstartPayload;
  CLEAR_QUICKSTARTS: ClearQuickstartsPayload;
  SET_ACTIVE_QUICKSTART: string;
  SET_ALL_STATES: { [key: string | number]: QuickStartState };
  SET_ACCOUNT_ID: string | undefined;
  INITIALIZE: undefined;
};

const initialState: QuickStartsStoreState = {
  quickstarts: {},
  activeQuickStartID: '',
  allQuickStartStates: {},
  accountId: undefined,
};

let store: ReturnType<
  typeof createSharedStore<QuickStartsStoreState, typeof EVENTS>
> | null = null;

/**
 * Gets or creates the QuickStarts shared store singleton.
 * The store is shared across all federated modules that import it.
 */
export const getQuickstartsStore = () => {
  if (!store) {
    store = createSharedStore<QuickStartsStoreState, typeof EVENTS>({
      initialState,
      events: EVENTS,
      onEventChange: (state, event, payload): QuickStartsStoreState => {
        switch (event as QuickStartsEvent) {
          case 'SET_QUICKSTARTS': {
            const { app, quickstarts } =
              payload as EventPayload['SET_QUICKSTARTS'];
            return {
              ...state,
              quickstarts: {
                ...state.quickstarts,
                [app]: quickstarts,
              },
            };
          }
          case 'ADD_QUICKSTART': {
            const { app, quickstart } =
              payload as EventPayload['ADD_QUICKSTART'];
            return {
              ...state,
              quickstarts: {
                ...state.quickstarts,
                [app]: [...(state.quickstarts[app] ?? []), quickstart],
              },
            };
          }
          case 'CLEAR_QUICKSTARTS': {
            const { activeQuickStartID } =
              (payload as EventPayload['CLEAR_QUICKSTARTS']) || {};
            // Keep currently opened quickstart
            const clearedQuickstarts = Object.entries(
              state.quickstarts
            ).reduce<{ [key: string]: QuickStart[] }>(
              (acc, [namespace, quickstarts]) => {
                const filtered = quickstarts.filter(
                  (qs) => qs?.metadata?.name === activeQuickStartID
                );
                if (filtered.length > 0) {
                  acc[namespace] = filtered;
                }
                return acc;
              },
              {}
            );
            return {
              ...state,
              quickstarts: clearedQuickstarts,
            };
          }
          case 'SET_ACTIVE_QUICKSTART': {
            const id = payload as EventPayload['SET_ACTIVE_QUICKSTART'];
            // Handle body class for drawer visibility
            if (typeof document !== 'undefined') {
              if (id !== '' && typeof id !== 'function') {
                document.body.classList.add('quickstarts-open');
              } else {
                document.body.classList.remove('quickstarts-open');
              }
            }
            return {
              ...state,
              activeQuickStartID: id,
            };
          }
          case 'SET_ALL_STATES': {
            const states = payload as EventPayload['SET_ALL_STATES'];
            return {
              ...state,
              allQuickStartStates: states,
            };
          }
          case 'SET_ACCOUNT_ID': {
            return {
              ...state,
              accountId: payload as EventPayload['SET_ACCOUNT_ID'],
            };
          }
          case 'INITIALIZE':
          default:
            return state;
        }
      },
    });
  }
  return store;
};

// API response types
interface QuickStartAPIResponse {
  data: { content: QuickStart }[];
}

/**
 * React hook for consuming the QuickStarts shared store.
 *
 * This hook provides access to quickstart state and actions without requiring
 * the Chrome API. It can be used by any federated module via Module Federation.
 *
 * @example
 * ```tsx
 * import { useQuickstartsStore } from 'learning-resources/quickstarts/useQuickstartsStore';
 *
 * function MyComponent() {
 *   const { quickstarts, activeQuickStartID, setQuickstarts, activateQuickstart } = useQuickstartsStore();
 *
 *   // Set quickstarts for your app
 *   setQuickstarts('myApp', myQuickstartsArray);
 *
 *   // Activate a specific quickstart
 *   activateQuickstart('my-quickstart-name');
 * }
 * ```
 */
export const useQuickstartsStore = () => {
  const store = getQuickstartsStore();
  const state = useGetState(store);

  /**
   * Sets quickstarts for a specific app namespace.
   * @param app - App identifier/namespace
   * @param quickstarts - Array of QuickStart objects
   */
  const setQuickstarts = (app: string, quickstarts: QuickStart[]) => {
    store.updateState('SET_QUICKSTARTS', { app, quickstarts });
  };

  /**
   * Adds a single quickstart to an app namespace.
   * @param app - App identifier/namespace
   * @param quickstart - QuickStart object to add
   */
  const addQuickstart = (app: string, quickstart: QuickStart) => {
    store.updateState('ADD_QUICKSTART', { app, quickstart });
  };

  /**
   * Clears all quickstarts, optionally keeping the currently active one.
   * @param activeQuickStartID - Optional ID of quickstart to preserve
   */
  const clearQuickstarts = (activeQuickStartID?: string) => {
    store.updateState('CLEAR_QUICKSTARTS', { activeQuickStartID });
  };

  /**
   * Sets the active quickstart ID and manages drawer visibility.
   * @param id - Quickstart ID to activate, or empty string to close
   */
  const setActiveQuickStartID = (id: string) => {
    store.updateState('SET_ACTIVE_QUICKSTART', id);
  };

  /**
   * Toggles a quickstart - opens if closed, closes if open.
   * @param id - Quickstart ID to toggle
   */
  const toggleQuickstart = (id: string) => {
    const currentId = state.activeQuickStartID;
    setActiveQuickStartID(currentId === id ? '' : id);
  };

  /**
   * Updates all quickstart progress states.
   * Also persists the active quickstart's progress to the API.
   * @param states - Object mapping quickstart IDs to their states
   */
  const setAllQuickStartStates = (states: {
    [key: string | number]: QuickStartState;
  }) => {
    const activeState = states[state.activeQuickStartID];

    // Persist progress to API if we have an active quickstart with state
    if (typeof activeState === 'object' && state.accountId) {
      axios
        .post('/api/quickstarts/v1/progress', {
          quickstartName: state.activeQuickStartID,
          accountId: parseInt(state.accountId),
          progress: activeState,
        })
        .catch((err) => {
          console.error(
            `Unable to persist quickstart progress! ${state.activeQuickStartID}`,
            err
          );
        });
    }

    store.updateState('SET_ALL_STATES', states);
  };

  /**
   * Sets the account ID for progress persistence.
   * @param accountId - User's account ID
   */
  const setAccountId = (accountId: string | undefined) => {
    store.updateState('SET_ACCOUNT_ID', accountId);
  };

  /**
   * Fetches and activates a quickstart by name from the API.
   * Also fetches any referenced nextQuickStart quickstarts.
   * @param name - Name of the quickstart to activate
   */
  const activateQuickstart = async (name: string) => {
    try {
      // 1. Fetch main quickstart
      const {
        data: { data },
      } = await axios.get<QuickStartAPIResponse>(
        '/api/quickstarts/v1/quickstarts',
        {
          params: { name },
        }
      );
      const mainQuickstarts = data.map(({ content }) => content);

      // 2. Extract nextQuickStart references
      const nextQuickStartNames = mainQuickstarts
        .flatMap((qs) => qs.spec.nextQuickStart || [])
        .filter((qsName, index, arr) => arr.indexOf(qsName) === index); // Remove duplicates

      // 3. Fetch referenced quickstarts
      let nextQuickstarts: QuickStart[] = [];
      if (nextQuickStartNames.length > 0) {
        try {
          const promises = nextQuickStartNames.map((nextName) =>
            axios.get<QuickStartAPIResponse>(
              '/api/quickstarts/v1/quickstarts',
              {
                params: { name: nextName },
              }
            )
          );
          const responses = await Promise.all(promises);
          nextQuickstarts = responses.flatMap((r) =>
            r.data.data.map(({ content }) => content)
          );
        } catch (error) {
          console.warn(
            'Some referenced quickstarts could not be fetched:',
            error
          );
          // Continue without the referenced quickstarts
        }
      }

      // 4. Populate both main and referenced quickstarts
      setQuickstarts('default', [...mainQuickstarts, ...nextQuickstarts]);
      setActiveQuickStartID(name);
    } catch (error) {
      console.error('Unable to activate quickstart called: ', name, error);
    }
  };

  /**
   * Loads saved quickstart progress from the API.
   * Should be called after setting the accountId.
   */
  const loadProgress = async () => {
    if (!state.accountId) return;

    try {
      const {
        data: { data },
      } = await axios.get<{
        data: { quickstartName: string; progress: QuickStartState }[];
      }>('/api/quickstarts/v1/progress', {
        params: { account: state.accountId },
      });

      const states = data.reduce<{ [key: string]: QuickStartState }>(
        (acc, curr) => ({
          ...acc,
          [curr.quickstartName]: curr.progress,
        }),
        {}
      );

      setAllQuickStartStates(states);
    } catch (error) {
      console.error('Unable to load quickstart progress:', error);
    }
  };

  /**
   * Returns all quickstarts as a flat array.
   */
  const getAllQuickstarts = (): QuickStart[] => {
    return Object.values(state.quickstarts).flat();
  };

  /**
   * Finds a quickstart by its metadata name.
   * @param name - Quickstart metadata name to find
   */
  const getQuickstartByName = (name: string): QuickStart | undefined => {
    return getAllQuickstarts().find((qs) => qs.metadata.name === name);
  };

  return {
    // State
    quickstarts: state.quickstarts,
    activeQuickStartID: state.activeQuickStartID,
    allQuickStartStates: state.allQuickStartStates,
    accountId: state.accountId,

    // Derived state
    getAllQuickstarts,
    getQuickstartByName,
    activeQuickStart: state.activeQuickStartID
      ? getQuickstartByName(state.activeQuickStartID)
      : null,

    // Actions
    setQuickstarts,
    addQuickstart,
    clearQuickstarts,
    setActiveQuickStartID,
    toggleQuickstart,
    setAllQuickStartStates,
    setAccountId,
    activateQuickstart,
    loadProgress,

    // Initialize store (for Chrome internal use)
    initialize: () => store.updateState('INITIALIZE', undefined),
  };
};

export default useQuickstartsStore;
