import React, { useState } from 'react';
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

/** Suggestions listed before the rest are folded behind "Show more". */
const SUGGESTIONS_SHOWN = 3;

/**
 * The validator's findings above an editor: errors that block, then
 * suggestions that do not, each naming its line and field. Both are plain
 * alerts laid out alike; only a long list of suggestions is shortened.
 */
const ResourceIssues = ({
  issues,
  blocks,
  onGoToLine,
}: ResourceIssuesProps) => {
  const [showAll, setShowAll] = useState(false);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const hidden = showAll ? 0 : Math.max(warnings.length - SUGGESTIONS_SHOWN, 0);

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
          title={`${plural(warnings.length, 'suggestion')} (not blocking)`}
          className="pf-v6-u-mb-sm"
        >
          {list(warnings.slice(0, warnings.length - hidden))}
          {warnings.length > SUGGESTIONS_SHOWN && (
            <Button
              variant="link"
              isInline
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show fewer' : `Show ${hidden} more`}
            </Button>
          )}
        </Alert>
      )}
    </>
  );
};

export default ResourceIssues;
