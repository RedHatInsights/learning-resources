import React from 'react';
import {
  dispatchOpenQuickStartInHelpPanel,
  openQuickStartInHelpPanel,
} from './openQuickStartInHelpPanel';

const mockUpdateState = jest.fn();
jest.mock('../store/openQuickstartInHelpPanelStore', () => ({
  getOpenQuickstartInHelpPanelStore: () => ({
    updateState: mockUpdateState,
    getState: () => ({ pendingOpen: null }),
  }),
}));

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: () => ({}),
}));

describe('openQuickStartInHelpPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUpdateState.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('dispatchOpenQuickStartInHelpPanel', () => {
    it('updates the shared store with quickstartId and displayName', () => {
      dispatchOpenQuickStartInHelpPanel('my-quickstart', 'My Quickstart');

      expect(mockUpdateState).toHaveBeenCalledTimes(1);
      expect(mockUpdateState).toHaveBeenCalledWith('OPEN_QUICKSTART', {
        quickstartId: 'my-quickstart',
        displayName: 'My Quickstart',
      });
    });

    it('accepts ReactNode as displayName', () => {
      const node = React.createElement('span', null, 'Custom title');

      dispatchOpenQuickStartInHelpPanel('id', node);

      expect(mockUpdateState).toHaveBeenCalledWith('OPEN_QUICKSTART', {
        quickstartId: 'id',
        displayName: node,
      });
    });
  });

  describe('openQuickStartInHelpPanel', () => {
    it('updates store immediately when openDrawer is false', () => {
      openQuickStartInHelpPanel('qs-1', 'Quickstart 1', { openDrawer: false });

      expect(mockUpdateState).toHaveBeenCalledTimes(1);
      expect(mockUpdateState).toHaveBeenCalledWith('OPEN_QUICKSTART', {
        quickstartId: 'qs-1',
        displayName: 'Quickstart 1',
      });
    });

    it('updates store after delay when openDrawer is true and drawerActions provided', () => {
      const toggleDrawerContent = jest.fn();

      openQuickStartInHelpPanel('qs-2', 'Quickstart 2', {
        openDrawer: true,
        drawerActions: { toggleDrawerContent },
      });

      expect(toggleDrawerContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateState).not.toHaveBeenCalled();

      jest.advanceTimersByTime(150);

      expect(mockUpdateState).toHaveBeenCalledTimes(1);
      expect(mockUpdateState).toHaveBeenCalledWith('OPEN_QUICKSTART', {
        quickstartId: 'qs-2',
        displayName: 'Quickstart 2',
      });
    });

    it('updates store immediately when openDrawer is true but no drawerActions', () => {
      openQuickStartInHelpPanel('qs-3', 'Quickstart 3', { openDrawer: true });

      expect(mockUpdateState).toHaveBeenCalledTimes(1);
      expect(mockUpdateState).toHaveBeenCalledWith('OPEN_QUICKSTART', {
        quickstartId: 'qs-3',
        displayName: 'Quickstart 3',
      });
    });
  });
});
