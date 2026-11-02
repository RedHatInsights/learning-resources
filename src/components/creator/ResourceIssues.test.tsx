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

describe('ResourceIssues', () => {
  it('lists problems and suggestions the same way, folding long suggestions', () => {
    const onGoToLine = jest.fn();
    render(
      <ResourceIssues
        issues={[
          issue('error', 1),
          ...[2, 3, 4, 5, 6].map((line) => issue('warning', line)),
        ]}
        blocks="saving"
        onGoToLine={onGoToLine}
      />
    );

    expect(screen.getByText('Fix 1 problem before saving')).toBeInTheDocument();
    expect(
      screen.getByText('5 suggestions (not blocking)')
    ).toBeInTheDocument();
    // Neither alert has a toggle, so their titles line up.
    expect(
      screen.queryByRole('button', { name: /suggestions/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('field4')).toBeInTheDocument();
    expect(screen.queryByText('field5')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));
    expect(screen.getByText('field6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('field6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Line 1' }));
    expect(onGoToLine).toHaveBeenCalledWith(1);
  });

  it('shows a short list of suggestions in full', () => {
    render(
      <ResourceIssues
        issues={[issue('warning', 2), issue('warning', 3)]}
        blocks="saving"
      />
    );
    expect(screen.getByText('Line 3', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
