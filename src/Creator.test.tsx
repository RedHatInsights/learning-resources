import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Creator from './Creator';
import {
  WorkspaceAction,
  WorkspaceState,
} from './components/creator/multi-edit/workspace';

jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: () => true,
}));

jest.mock(
  '@redhat-cloud-services/frontend-components-utilities/useSuspenseLoader/useSuspenseLoader',
  () => ({
    __esModule: true,
    default: () => ({ loader: () => ({ data: { categories: [] } }) }),
  })
);

// Holds state of its own, as the real wizard holds the PR it continues.
const MockWizard = ({ resetCreator }: { resetCreator: () => void }) => {
  const [resumed, setResumed] = useState(false);
  return (
    <>
      <button onClick={resetCreator}>Reset single creator</button>
      <button onClick={() => setResumed(true)}>
        {resumed ? 'Continuing PR' : 'Continue PR'}
      </button>
    </>
  );
};

jest.mock('./components/creator/CreatorWizard', () => ({
  __esModule: true,
  EMPTY_TASK: {},
  default: (props: { resetCreator: () => void }) => <MockWizard {...props} />,
}));

jest.mock('./components/creator/CreatorPreview', () => ({
  __esModule: true,
  default: () => null,
}));

// Stands in for the batch editor: shows what it was given and edits it.
jest.mock('./components/creator/multi-edit/MultiEditWorkspace', () => ({
  __esModule: true,
  default: ({
    state,
    dispatch,
  }: {
    state: WorkspaceState;
    dispatch: (action: WorkspaceAction) => void;
  }) => (
    <div>
      <span data-testid="workspace">
        {state.resources.map((r) => `${r.name}:${r.buffer}`).join(',')}
      </span>
      <button
        onClick={() =>
          dispatch({
            type: 'createResource',
            name: 'fresh',
            buffer: 'metadata:\n  name: fresh\n',
          })
        }
      >
        Create fresh
      </button>
    </div>
  ),
}));

const switchTo = (name: RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }));

describe('Creator modes', () => {
  it('keeps batch work across mode switches and flags it on the toggle', () => {
    render(<Creator />);
    switchTo(/^Edit multiple resources/);
    expect(
      screen.getByRole('heading', { name: 'Edit learning resources' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create fresh' }));

    switchTo(/^Single resource/);
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Edit multiple resources/ })
    ).toHaveTextContent('1');

    switchTo(/^Edit multiple resources/);
    expect(screen.getByTestId('workspace')).toHaveTextContent(
      'fresh:metadata:'
    );
  });

  it('keeps the single-resource PR across a trip to batch mode', () => {
    render(<Creator />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue PR' }));
    switchTo(/^Edit multiple resources/);
    switchTo(/^Single resource/);
    expect(
      screen.getByRole('button', { name: 'Continuing PR' })
    ).toBeInTheDocument();
  });

  it('warns before leaving with batch work, in either mode', () => {
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    render(<Creator />);
    expect(unload()).toBe(false);

    switchTo(/^Edit multiple resources/);
    fireEvent.click(screen.getByRole('button', { name: 'Create fresh' }));
    expect(unload()).toBe(true);

    switchTo(/^Single resource/);
    expect(unload()).toBe(true);
  });

  it('resetting the single-resource creator leaves batch work alone', () => {
    render(<Creator />);
    switchTo(/^Edit multiple resources/);
    fireEvent.click(screen.getByRole('button', { name: 'Create fresh' }));

    switchTo(/^Single resource/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset single creator' })
    );
    // The reset remounts the page in single mode.
    switchTo(/^Edit multiple resources/);
    expect(screen.getByTestId('workspace')).toHaveTextContent('fresh');
  });
});
