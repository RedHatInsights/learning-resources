export type DiffLineType = 'context' | 'add' | 'del';

export interface DiffLine {
  type: DiffLineType;
  text: string;
  /** The line's number in the file it belongs to: before for removed lines. */
  number: number;
}

/** Above this many cells the changed middle is shown as replaced outright. */
const MAX_LCS_CELLS = 4_000_000;

const splitLines = (text: string) => {
  if (text === '') return [];
  const lines = text.split('\n');
  // A trailing newline ends the last line rather than starting another.
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

/**
 * Line diff of two texts, in file order, with removals before additions in
 * each changed run. The common head and tail are trimmed first, so the
 * longest-common-subsequence table only covers the part that changed, which
 * for an edit to a few lines of a long file stays tiny.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  const result: DiffLine[] = [];
  for (let i = 0; i < head; i++) {
    result.push({ type: 'context', text: a[i], number: i + 1 });
  }

  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  const n = midA.length;
  const m = midB.length;
  const pushDel = (i: number) =>
    result.push({ type: 'del', text: midA[i], number: head + i + 1 });
  const pushAdd = (j: number) =>
    result.push({ type: 'add', text: midB[j], number: head + j + 1 });

  if (n * m > MAX_LCS_CELLS) {
    midA.forEach((_, i) => pushDel(i));
    midB.forEach((_, j) => pushAdd(j));
  } else {
    // lcs[i][j] is the LCS length of midA[i..] and midB[j..].
    const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i][j] =
          midA[i] === midB[j]
            ? lcs[i + 1][j + 1] + 1
            : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        result.push({ type: 'context', text: midB[j], number: head + j + 1 });
        i++;
        j++;
      } else if (j >= m || (i < n && lcs[i + 1][j] >= lcs[i][j + 1])) {
        pushDel(i++);
      } else {
        pushAdd(j++);
      }
    }
  }

  for (let k = b.length - tail; k < b.length; k++) {
    result.push({ type: 'context', text: b[k], number: k + 1 });
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
