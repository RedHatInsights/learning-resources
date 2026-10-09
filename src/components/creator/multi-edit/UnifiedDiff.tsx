import React, { useMemo, useState } from 'react';
import { DiffLine, collapseContext, diffLines } from './lineDiff';

const MARKERS = { context: ' ', add: '+', del: '-' } as const;
const LABELS = { context: '', add: 'Added', del: 'Removed' } as const;

const Line: React.FC<{ line: DiffLine }> = ({ line }) => (
  <tr className={`lr-c-unified-diff__line pf-m-${line.type}`}>
    <td className="lr-c-unified-diff__number">{line.number}</td>
    <td className="lr-c-unified-diff__marker">
      <span aria-hidden="true">{MARKERS[line.type]}</span>
      {line.type !== 'context' && (
        <span className="pf-v6-screen-reader">{LABELS[line.type]}</span>
      )}
    </td>
    <td className="lr-c-unified-diff__code">{line.text || ' '}</td>
  </tr>
);

/**
 * A GitHub-style unified diff: one line-number column, a +/- marker, and
 * wrapped code, so a long line is one numbered row however it wraps.
 * Unchanged stretches away from any change are folded and can be expanded.
 */
const UnifiedDiff: React.FC<{ before: string; after: string }> = ({
  before,
  after,
}) => {
  const rows = useMemo(
    () => collapseContext(diffLines(before, after)),
    [before, after]
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const unchanged = rows.every(
    (row) => row.kind === 'gap' || row.line.type === 'context'
  );

  return (
    <div className="lr-c-unified-diff">
      {unchanged && (
        <p className="lr-c-unified-diff__empty">No line changes.</p>
      )}
      <table aria-label="Line changes">
        <tbody>
          {rows.map((row) => {
            if (row.kind === 'line') {
              return (
                <Line
                  key={`${row.line.type}-${row.line.number}`}
                  line={row.line}
                />
              );
            }
            if (expanded.has(row.id)) {
              return row.lines.map((line) => (
                <Line key={`context-${line.number}`} line={line} />
              ));
            }
            return (
              <tr key={`gap-${row.id}`} className="lr-c-unified-diff__gap">
                <td colSpan={3}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => new Set(prev).add(row.id))
                    }
                  >
                    Show {row.lines.length} unchanged lines (
                    {row.lines[0].number}–
                    {row.lines[row.lines.length - 1].number})
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UnifiedDiff;
