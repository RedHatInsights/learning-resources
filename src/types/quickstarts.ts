import { QuickStart, QuickStartState } from '@patternfly/quickstarts';
import React from 'react';

/**
 * State object for all QuickStarts, keyed by QuickStart name
 */
export type AllQuickStartStates = Record<string | number, QuickStartState>;

/**
 * Options for creating a scoped QuickStart controller
 */
export interface ScopedControllerOptions {
  /** QuickStarts available in this scope */
  quickStarts?: QuickStart[];
  /**
   * When true, syncs allQuickStartStates with the shared store.
   * Progress will be persisted to API and shared across all UIs.
   * activeQuickStartID remains local (won't open global drawer).
   * @default false
   */
  syncWithStore?: boolean;
}

/**
 * A scoped QuickStart controller for rendering QuickStarts outside Chrome's managed drawer.
 * Use this when you need to render QuickStart content in custom UI (e.g., HelpPanel tabs).
 */
export interface ScopedQuickStartController {
  /** The currently active QuickStart, or null if none */
  activeQuickStart: QuickStart | null;
  /** The ID of the currently active QuickStart */
  activeQuickStartID: string;
  /** State for all QuickStarts in this scope */
  allQuickStartStates: AllQuickStartStates;
  /** Set the active QuickStart by ID (pass empty string to deactivate) */
  setActiveQuickStartID: (id: string) => void;
  /** Update QuickStart states */
  setAllQuickStartStates: React.Dispatch<
    React.SetStateAction<AllQuickStartStates>
  >;
  /** Restart the currently active QuickStart */
  restartQuickStart: () => void;
}
