import React from 'react';
import { createSharedStore } from '@scalprum/core';

export interface PendingOpenQuickstart {
  quickstartId: string;
  displayName: React.ReactNode;
}

export interface OpenQuickstartInHelpPanelState {
  pendingOpen: PendingOpenQuickstart | null;
}

const EVENTS = ['OPEN_QUICKSTART', 'CONSUMED_OPEN'] as const;

let store: ReturnType<
  typeof createSharedStore<OpenQuickstartInHelpPanelState, typeof EVENTS>
> | null = null;

/**
 * Returns the singleton shared store for "open quickstart in Help Panel" requests.
 * Used for cross-tree communication (e.g. main app → Help Panel drawer).
 */
export function getOpenQuickstartInHelpPanelStore(): ReturnType<
  typeof createSharedStore<OpenQuickstartInHelpPanelState, typeof EVENTS>
> {
  if (!store) {
    store = createSharedStore({
      initialState: { pendingOpen: null },
      events: EVENTS,
      onEventChange: (
        state: OpenQuickstartInHelpPanelState,
        event: (typeof EVENTS)[number],
        payload?: { quickstartId: string; displayName: React.ReactNode }
      ): OpenQuickstartInHelpPanelState => {
        switch (event) {
          case 'OPEN_QUICKSTART':
            return {
              pendingOpen:
                payload != null
                  ? {
                      quickstartId: payload.quickstartId,
                      displayName: payload.displayName,
                    }
                  : null,
            };
          case 'CONSUMED_OPEN':
            return { pendingOpen: null };
          default:
            return state;
        }
      },
    });
  }
  return store;
}
