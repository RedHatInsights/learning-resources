/**
 * Shared test utilities for user journey tests.
 * Centralizes timing configuration for consistent visual feedback.
 */

/**
 * Centralized timeout configuration for test helpers.
 * These delays make user journeys easier to follow visually.
 */
export const TEST_TIMEOUTS = {
  /** Default timeout for waiting on elements after mutations (e.g., API calls) */
  ELEMENT_WAIT: 10000,

  /** Very quick UI settle (checkbox toggle, etc.) */
  QUICK_SETTLE: 100,
  /** Short delay after menu/dropdown opens */
  AFTER_MENU_OPEN: 300,
  /** Default delay after click actions to allow UI to settle */
  AFTER_CLICK: 400,
  /** Delay after expand/collapse or panel open actions */
  AFTER_EXPAND: 600,
  /** Delay after drawer animations to complete */
  AFTER_DRAWER_OPEN: 800,
  /** Delay after tab navigation */
  AFTER_TAB_CHANGE: 500,
} as const;

/**
 * Test utility delay function for visual pauses in user journeys.
 * Use this instead of importing delay from MSW.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
