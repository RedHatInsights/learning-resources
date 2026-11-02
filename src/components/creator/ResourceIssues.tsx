import React, { useId, useState } from 'react';
import { Button, Icon } from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/exclamation-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/dynamic/icons/exclamation-triangle-icon';
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

/** Up to this many issues are listed straight away; more start folded. */
const SHOWN_OPEN = 3;

const StatusIcon = ({ severity }: { severity: ResourceIssue['severity'] }) => (
  <Icon status={severity === 'error' ? 'danger' : 'warning'} isInline>
    {severity === 'error' ? (
      <ExclamationCircleIcon />
    ) : (
      <ExclamationTriangleIcon />
    )}
  </Icon>
);

/**
 * The validator's findings above an editor. One summary row counts the
 * problems that block and the suggestions that do not; the list below it
 * scrolls within a capped height, so the editor always keeps its room. A
 * short list starts open, a long one folded, until the author toggles it.
 */
const ResourceIssues = ({
  issues,
  blocks,
  onGoToLine,
}: ResourceIssuesProps) => {
  // Null follows the list's length; a toggle pins it. Kept while the
  // component stays mounted, so it carries across resources in multi-edit.
  const [pinned, setPinned] = useState<boolean | null>(null);
  const listId = useId();
  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const expanded = pinned ?? issues.length <= SHOWN_OPEN;

  return (
    <div className="lr-c-resource-issues">
      <div className="lr-c-resource-issues__summary">
        {errors.length > 0 && (
          <span className="lr-c-resource-issues__count pf-m-danger">
            <StatusIcon severity="error" />
            {`Fix ${plural(errors.length, 'problem')} before ${blocks}`}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="lr-c-resource-issues__count">
            <StatusIcon severity="warning" />
            {`${plural(warnings.length, 'suggestion')} (not blocking)`}
          </span>
        )}
        <Button
          variant="link"
          isInline
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setPinned(!expanded)}
        >
          {expanded ? 'Hide details' : 'Show details'}
        </Button>
      </div>
      {expanded && (
        <ul id={listId} className="lr-c-resource-issues__list">
          {[...errors, ...warnings].map((issue, i) => (
            <li key={i}>
              <StatusIcon severity={issue.severity} />
              <span className="pf-v6-screen-reader">
                {issue.severity === 'error' ? 'Problem: ' : 'Suggestion: '}
              </span>
              <span>
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
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ResourceIssues;
