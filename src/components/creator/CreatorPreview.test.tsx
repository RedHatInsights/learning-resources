import React, { useState } from 'react';
import { TextDecoder, TextEncoder } from 'util';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreatorWizardStage, metaForKind } from './meta';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';

// The quick start library pulls in react-dom/server, which needs these.
Object.assign(global, { TextDecoder, TextEncoder });
// jsdom has no scrolling; the panel scrolls to the top on every step.
Element.prototype.scrollTo = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreatorPreview = require('./CreatorPreview').default;

jest.mock(
  '../GlobalLearningResourcesPage/GlobalLearningResourcesQuickstartItem',
  () => ({
    __esModule: true,
    default: ({ onOpenQuickStart }: { onOpenQuickStart?: () => void }) => (
      <button onClick={onOpenQuickStart}>Catalog card</button>
    ),
  })
);

const quickStart = {
  apiVersion: 'console.openshift.io/v1',
  kind: 'QuickStarts',
  metadata: { name: 'preview-qs', tags: [] },
  spec: {
    version: 0.1,
    displayName: 'Preview QS',
    description: 'A quick start',
    durationMinutes: 5,
    introduction: 'Intro text',
    conclusion: 'All done here',
    tasks: [
      { title: 'First task', description: 'Do the first thing' },
      { title: 'Second task', description: 'Do the second thing' },
      { title: 'Third task', description: 'Do the third thing' },
    ],
  },
} as unknown as ExtendedQuickstart;

const Harness = ({ initial }: { initial: CreatorWizardStage }) => {
  const [stage, setStage] = useState<CreatorWizardStage>(initial);
  return (
    <>
      <output data-testid="stage">
        {stage.type}
        {stage.type === 'task' ? stage.index : ''}
      </output>
      <button onClick={() => setStage({ type: 'task', index: 2 })}>
        Jump to task 3
      </button>
      <CreatorPreview
        kindMeta={metaForKind('quickstart')}
        quickStart={quickStart}
        currentStage={stage}
        filterMap={{}}
        onStageChange={setStage}
      />
    </>
  );
};

describe('CreatorPreview', () => {
  it('opens its own panel from the catalog card', () => {
    render(<Harness initial={{ type: 'card' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Catalog card' }));
    expect(screen.getByTestId('stage')).toHaveTextContent('panel-overview');
  });

  it('opens straight on a task without visiting the overview first', () => {
    render(<Harness initial={{ type: 'card' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jump to task 3' }));
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
  });

  it('mounts on a task, as after switching back from the editor', () => {
    render(<Harness initial={{ type: 'task', index: 1 }} />);
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('reports panel navigation so a stage picker can follow', () => {
    render(<Harness initial={{ type: 'panel-overview' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByTestId('stage')).toHaveTextContent('task0');
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('reaches the closing summary with Next', () => {
    render(<Harness initial={{ type: 'task', index: 2 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('stage')).toHaveTextContent('task3');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
