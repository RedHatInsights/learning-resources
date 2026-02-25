import React from 'react';
import {
  OPEN_QUICKSTART_IN_HELP_PANEL_EVENT,
  dispatchOpenQuickStartInHelpPanel,
  openQuickStartInHelpPanel,
} from './openQuickStartInHelpPanel';

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  default: () => ({}),
}));

describe('openQuickStartInHelpPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('dispatchOpenQuickStartInHelpPanel', () => {
    it('dispatches a CustomEvent with quickstartId and displayName', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      dispatchOpenQuickStartInHelpPanel('my-quickstart', 'My Quickstart');

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(OPEN_QUICKSTART_IN_HELP_PANEL_EVENT);
      expect(event.detail).toEqual({
        quickstartId: 'my-quickstart',
        displayName: 'My Quickstart',
      });
      dispatchSpy.mockRestore();
    });

    it('accepts ReactNode as displayName', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
      const node = React.createElement('span', null, 'Custom title');

      dispatchOpenQuickStartInHelpPanel('id', node);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(
        (dispatchSpy.mock.calls[0][0] as CustomEvent).detail.displayName
      ).toEqual(node);
      dispatchSpy.mockRestore();
    });
  });

  describe('openQuickStartInHelpPanel', () => {
    it('dispatches immediately when openDrawer is false', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      openQuickStartInHelpPanel('qs-1', 'Quickstart 1', { openDrawer: false });

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(
        (dispatchSpy.mock.calls[0][0] as CustomEvent).detail.quickstartId
      ).toBe('qs-1');
      dispatchSpy.mockRestore();
    });

    it('dispatches after delay when openDrawer is true and drawerActions provided', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
      const toggleDrawerContent = jest.fn();

      openQuickStartInHelpPanel('qs-2', 'Quickstart 2', {
        openDrawer: true,
        drawerActions: { toggleDrawerContent },
      });

      expect(toggleDrawerContent).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).not.toHaveBeenCalled();

      jest.advanceTimersByTime(150);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect((dispatchSpy.mock.calls[0][0] as CustomEvent).detail).toEqual({
        quickstartId: 'qs-2',
        displayName: 'Quickstart 2',
      });
      dispatchSpy.mockRestore();
    });

    it('dispatches immediately when openDrawer is true but no drawerActions', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      openQuickStartInHelpPanel('qs-3', 'Quickstart 3', { openDrawer: true });

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      dispatchSpy.mockRestore();
    });
  });
});
