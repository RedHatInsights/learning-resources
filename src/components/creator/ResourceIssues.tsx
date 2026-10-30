import React from 'react';
import { Alert, Button } from '@patternfly/react-core';
import { ResourceIssue } from './validateResource';
import './ResourceIssues.scss';

type ResourceIssuesProps = {
  issues: ResourceIssue[];
  /** What errors hold back, e.g. "saving". */
  blocks: string;
  /** Moves the editor to a line; without it lines are plain text. */
  onGoToLine?: (line: number) => void;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The validator's findings above an editor: errors that block, then
 * warnings folded away, each naming its line and field.
 */
const ResourceIssues = ({
  issues,
  blocks,
  onGoToLine,
}: ResourceIssuesProps) => {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const list = (items: ResourceIssue[]) => (
    <ul className="lr-c-resource-issues">
      {items.map((issue, i) => (
        <li key={i}>
          {onGoToLine ? (
            <Button
              variant="link"
              isInline
              onClick={() => onGoToLine(issue.line)}
            >
              Line {issue.line}
            </Button>
          ) : (
            `Line ${issue.line}`
          )}
          {issue.field && (
            <>
              {', '}
              <code>{issue.field}</code>
            </>
          )}
          : {issue.message}
          {issue.existing &&
            ' The saved file already has this, so it does not block saving.'}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {errors.length > 0 && (
        <Alert
          variant="danger"
          isInline
          isPlain
          title={`Fix ${plural(errors.length, 'problem')} before ${blocks}`}
          className="pf-v6-u-mb-sm"
        >
          {list(errors)}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert
          variant="warning"
          isInline
          isPlain
          isExpandable
          toggleAriaLabel="Show suggestions"
          title={`${plural(warnings.length, 'suggestion')} (not blocking)`}
          className="pf-v6-u-mb-sm"
        >
          {list(warnings)}
        </Alert>
      )}
    </>
  );
};

export default ResourceIssues;
