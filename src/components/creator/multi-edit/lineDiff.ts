import { diffArrays } from 'diff';

export type DiffLineType = 'context' | 'add' | 'del';

export interface DiffLine {
  type: DiffLineType;
  text: string;
  /** The line's number in the file it belongs to: before for removed lines. */
  number: number;
}

const splitLines = (text: string) => {
  if (text === '') return [];
  const lines = text.split('\n');
  // A trailing newline ends the last line rather than starting another.
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

/**
 * Line diff of two texts, in file order, with removals before additions in
 * each changed run. jsdiff does the diffing; this only numbers the lines.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const result: DiffLine[] = [];
  let a = 0;
  let b = 0;
  for (const part of diffArrays(splitLines(before), splitLines(after))) {
    for (const text of part.value) {
      if (part.removed) {
        result.push({ type: 'del', text, number: ++a });
      } else if (part.added) {
        result.push({ type: 'add', text, number: ++b });
      } else {
        a++;
        result.push({ type: 'context', text, number: ++b });
      }
    }
  }
  return result;
}

export type DiffRow =
  | { kind: 'line'; line: DiffLine }
  | { kind: 'gap'; id: number; lines: DiffLine[] };

/**
 * Groups a diff into what is shown: changed lines with `context` unchanged
 * lines around them, and gaps standing in for longer unchanged stretches.
 */
export function collapseContext(lines: DiffLine[], context = 3): DiffRow[] {
  const keep = lines.map(() => false);
  lines.forEach((line, i) => {
    if (line.type === 'context') return;
    for (
      let k = Math.max(0, i - context);
      k <= Math.min(lines.length - 1, i + context);
      k++
    ) {
      keep[k] = true;
    }
  });

  const rows: DiffRow[] = [];
  let gap: DiffLine[] = [];
  const flush = () => {
    // Hiding a single line saves nothing over showing it.
    if (gap.length === 1) rows.push({ kind: 'line', line: gap[0] });
    else if (gap.length > 1) {
      rows.push({ kind: 'gap', id: gap[0].number, lines: gap });
    }
    gap = [];
  };
  lines.forEach((line, i) => {
    if (keep[i]) {
      flush();
      rows.push({ kind: 'line', line });
    } else {
      gap.push(line);
    }
  });
  flush();
  return rows;
}
