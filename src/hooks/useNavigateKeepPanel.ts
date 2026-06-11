import { useCallback } from 'react';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';

/**
 * Returns a function that navigates to a new path while keeping the help panel open.
 *
 * Uses Chrome's own history object (instead of React Router's `useNavigate`)
 * because the help panel module may render outside the shell's BrowserRouter.
 *
 * After pushing the new path it:
 * 1. Dispatches a `popstate` event so that federated modules with their own
 *    BrowserRouter detect the URL change. `history.pushState()` (used
 *    internally by `chromeHistory.push()`) does **not** fire `popstate`,
 *    so without this step a module that is already mounted for the same
 *    route pattern (e.g. navigating between two `/docs/api/*` pages) would
 *    not re-render.
 * 2. Re-asserts the drawer panel content after a short delay to counteract
 *    Chrome's safety-net that closes the panel on route changes.
 */
const useNavigateKeepPanel = (): ((path: string) => void) => {
  const chrome = useChrome();

  return useCallback(
    (path: string) => {
      const { drawerActions, chromeHistory } = chrome;

      chromeHistory.push(path);

      // Notify federated modules whose own BrowserRouter listens for popstate
      window.dispatchEvent(
        new PopStateEvent('popstate', { state: window.history.state })
      );

      // Re-assert drawer content after Chrome's safety-net effect
      setTimeout(() => {
        drawerActions?.setDrawerPanelContent({
          scope: 'learningResources',
          module: './HelpPanel',
        });
      }, 50);
    },
    [chrome]
  );
};

export default useNavigateKeepPanel;
