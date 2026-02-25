import React from 'react';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

export const OPEN_QUICKSTART_IN_HELP_PANEL_EVENT =
  'learning-resources/open-quickstart';

export interface OpenQuickStartInHelpPanelDetail {
  quickstartId: string;
  displayName: React.ReactNode | string;
}

export interface OpenQuickStartInHelpPanelOptions {
  /**
   * When true (default), open the Help Panel drawer first if it is closed
   * (e.g. user on global learning resources page).
   * When false, only add the quickstart tab (caller is already inside Help Panel,
   * e.g. Learn tab or Search).
   */
  openDrawer?: boolean;
}

/**
 * Dispatches the custom event so HelpPanelCustomTabs can add a new quickstart tab.
 * Can be used without chrome (e.g. in tests or when only adding a tab).
 */
export function dispatchOpenQuickStartInHelpPanel(
  quickstartId: string,
  displayName: React.ReactNode | string
): void {
  window.dispatchEvent(
    new CustomEvent<OpenQuickStartInHelpPanelDetail>(
      OPEN_QUICKSTART_IN_HELP_PANEL_EVENT,
      {
        detail: { quickstartId, displayName },
      }
    )
  );
}

const HELP_PANEL_DRAWER = {
  scope: 'learningResources',
  module: './HelpPanel',
} as const;

/**
 * Opens a quickstart in the Help Panel as a new tab.
 * When openDrawer is true (default), opens the Help Panel drawer first if closed,
 * then dispatches the event after a short delay so the Help Panel has time to mount.
 * When openDrawer is false (e.g. caller is inside Help Panel), only adds the tab immediately.
 */
export function openQuickStartInHelpPanel(
  quickstartId: string,
  displayName: React.ReactNode | string,
  options: OpenQuickStartInHelpPanelOptions & {
    drawerActions?: {
      toggleDrawerContent: (data: typeof HELP_PANEL_DRAWER) => void;
    };
  } = {}
): void {
  const { openDrawer = true, drawerActions } = options;

  if (openDrawer && drawerActions) {
    drawerActions.toggleDrawerContent(HELP_PANEL_DRAWER);
    // Defer dispatch so the drawer can open and Help Panel mount before the event fires.
    setTimeout(() => {
      dispatchOpenQuickStartInHelpPanel(quickstartId, displayName);
    }, 150);
  } else {
    dispatchOpenQuickStartInHelpPanel(quickstartId, displayName);
  }
}

/**
 * Hook that returns a function to open a quickstart in the Help Panel.
 * Uses useChrome() for drawerActions when openDrawer is true.
 */
export function useOpenQuickStartInHelpPanel(): (
  quickstartId: string,
  displayName: React.ReactNode | string,
  options?: OpenQuickStartInHelpPanelOptions
) => void {
  const chrome = useChrome();

  return React.useCallback(
    (
      quickstartId: string,
      displayName: React.ReactNode | string,
      options: OpenQuickStartInHelpPanelOptions = {}
    ) => {
      const { openDrawer = true } = options;
      openQuickStartInHelpPanel(quickstartId, displayName, {
        openDrawer,
        drawerActions: openDrawer ? chrome?.drawerActions : undefined,
      });
    },
    [chrome?.drawerActions]
  );
}
