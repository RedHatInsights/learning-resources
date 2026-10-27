import { collapseContext, diffLines } from './lineDiff';

const lines = (n: number, prefix = 'line') =>
  Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`).join('\n') + '\n';

describe('diffLines', () => {
  it('marks a changed line as removed then added, numbered in its own file', () => {
    const before = 'a\nb\nc\n';
    const after = 'a\nB\nc\n';
    expect(diffLines(before, after)).toEqual([
      { type: 'context', text: 'a', number: 1 },
      { type: 'del', text: 'b', number: 2 },
      { type: 'add', text: 'B', number: 2 },
      { type: 'context', text: 'c', number: 3 },
    ]);
  });

  it('keeps unchanged lines between edits and numbers them by the new file', () => {
    const diff = diffLines('x\na\nb\n', 'a\nb\ny\n');
    expect(diff.map((l) => `${l.type}:${l.text}:${l.number}`)).toEqual([
      'del:x:1',
      'context:a:1',
      'context:b:2',
      'add:y:3',
    ]);
  });

  it('treats a new file as all additions', () => {
    expect(diffLines('', 'a\nb\n').map((l) => l.type)).toEqual(['add', 'add']);
  });
});

describe('collapseContext', () => {
  it('folds long unchanged stretches but keeps three lines around a change', () => {
    const before = lines(20);
    const after = before.replace('line 10\n', 'line ten\n');
    const rows = collapseContext(diffLines(before, after));
    expect(rows[0]).toEqual(expect.objectContaining({ kind: 'gap', id: 1 }));
    expect(rows[0].kind === 'gap' && rows[0].lines).toHaveLength(6);
    const shown = rows
      .filter((r) => r.kind === 'line')
      .map((r) => r.kind === 'line' && r.line.number);
    expect(shown).toEqual([7, 8, 9, 10, 10, 11, 12, 13]);
    expect(rows[rows.length - 1]).toEqual(
      expect.objectContaining({ kind: 'gap', id: 14 })
    );
  });

  it('shows a single unchanged line instead of folding it', () => {
    const before = lines(8);
    const after = before
      .replace('line 1\n', 'one\n')
      .replace('line 8\n', 'eight\n');
    const rows = collapseContext(diffLines(before, after));
    expect(rows.every((r) => r.kind === 'line')).toBe(true);
  });
});
