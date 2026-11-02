import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ResourceIssues from './ResourceIssues';
import { ResourceIssue } from './validateResource';

const issue = (
  severity: ResourceIssue['severity'],
  line: number
): ResourceIssue => ({
  severity,
  field: `field${line}`,
  message: `Message ${line}.`,
  line,
});

const many = [
  issue('warning', 1),
  issue('error', 2),
  ...[3, 4, 5].map((line) => issue('warning', line)),
];

describe('ResourceIssues', () => {
  it('counts problems and suggestions in one row, folding a long list', () => {
    const { rerender } = render(
      <ResourceIssues issues={many} blocks="saving" />
    );
    expect(screen.getByText('Fix 1 problem before saving')).toBeInTheDocument();
    expect(
      screen.getByText('4 suggestions (not blocking)')
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    const items = screen.getAllByRole('listitem');
    // Problems first, then suggestions.
    expect(items[0]).toHaveTextContent('Problem: Line 2, field2: Message 2.');
    expect(items[1]).toHaveTextContent('Suggestion: Line 1, field1');
    expect(items).toHaveLength(5);

    // The author's choice holds when the issues change, e.g. on another
    // resource.
    rerender(<ResourceIssues issues={[issue('error', 9)]} blocks="saving" />);
    expect(screen.getByText('field9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }));
    rerender(<ResourceIssues issues={many.slice(0, 2)} blocks="saving" />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show details' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('lists a short list straight away, with lines that jump', () => {
    const onGoToLine = jest.fn();
    render(
      <ResourceIssues
        issues={[issue('error', 2), issue('warning', 3)]}
        blocks="saving"
        onGoToLine={onGoToLine}
      />
    );
    expect(screen.getByText('field3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Line 2' }));
    expect(onGoToLine).toHaveBeenCalledWith(2);
  });

  it('renders nothing without issues', () => {
    const { container } = render(
      <ResourceIssues issues={[]} blocks="saving" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
