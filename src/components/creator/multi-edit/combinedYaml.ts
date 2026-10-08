import YAML, { Node, Pair, YAMLMap, isMap, isScalar } from 'yaml';

/**
 * A resource on disk is two files: `metadata.yml` (kind, name, tags) and the
 * content file. Authors edit them as one document, the same shape the
 * single-resource YAML view shows: the content file with the metadata tags
 * under `metadata.tags`.
 *
 * Both directions work on text, not on re-serialized YAML: the tags block is
 * moved between the files line for line. Lines the author did not touch keep
 * their exact bytes, so a URL-only edit changes one line of one file, and
 * comments, quoting, `~` and unknown fields survive.
 */

// Real repository content has duplicate keys; tolerate them when reading so
// such a resource can still be opened. Saving still validates strictly.
const TOLERANT = { uniqueKeys: false } as const;

const findPair = (map: YAMLMap, key: string): Pair<Node, Node> | undefined =>
  map.items.find((p) => isScalar(p.key) && p.key.value === key) as
    | Pair<Node, Node>
    | undefined;

function lineAt(text: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

function columnOf(text: string, offset: number): number {
  return offset - (text.lastIndexOf('\n', offset - 1) + 1);
}

/** The whole lines a map entry spans, from its key to the end of its value. */
function pairLines(text: string, pair: Pair<Node, Node>): [number, number] {
  const start = pair.key.range?.[0] ?? 0;
  let end = pair.value?.range?.[1] ?? pair.key.range?.[1] ?? start;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return [lineAt(text, start), lineAt(text, Math.max(start, end - 1))];
}

const reindent = (lines: string[], from: number, to: number) =>
  lines.map((line) =>
    line.trim() === '' ? line : ' '.repeat(to) + line.slice(from)
  );

function blockMap(doc: YAML.Document.Parsed, key?: string): YAMLMap | null {
  const node = key ? doc.get(key, true) : doc.contents;
  return isMap(node) && !node.flow ? node : null;
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Merges the metadata file's tags into the content file. Returns null when the
 * files cannot be combined losslessly (unusual structure, parse errors, or the
 * content file already carries its own tags); the caller then edits the
 * content file on its own.
 */
export function combineFiles(
  metadataText: string,
  contentText: string
): string | null {
  const metaDoc = YAML.parseDocument(metadataText, TOLERANT);
  const contentDoc = YAML.parseDocument(contentText, TOLERANT);
  if (metaDoc.errors.length > 0 || contentDoc.errors.length > 0) return null;

  const metaRoot = blockMap(metaDoc);
  const contentMeta = blockMap(contentDoc, 'metadata');
  if (!metaRoot || !contentMeta || contentMeta.items.length === 0) return null;
  if (findPair(contentMeta, 'tags')) return null;

  const tagsPair = findPair(metaRoot, 'tags');
  let block = ['tags: []'];
  if (tagsPair) {
    const [s, e] = pairLines(metadataText, tagsPair);
    const column = columnOf(metadataText, tagsPair.key.range?.[0] ?? 0);
    block = reindent(metadataText.split('\n').slice(s, e + 1), column, 0);
  }

  const first = contentMeta.items[0] as Pair<Node, Node>;
  const last = contentMeta.items[contentMeta.items.length - 1] as Pair<
    Node,
    Node
  >;
  const indent = columnOf(contentText, first.key.range?.[0] ?? 0);
  const [, insertAfter] = pairLines(contentText, last);

  const lines = contentText.split('\n');
  lines.splice(insertAfter + 1, 0, ...reindent(block, 0, indent));
  const combined = lines.join('\n');

  // Trust the text surgery only when it means exactly what the files mean.
  const expected = contentDoc.toJS();
  expected.metadata = { ...expected.metadata, tags: metaDoc.toJS().tags ?? [] };
  const actual = YAML.parse(combined, TOLERANT);
  return sameValue(actual, expected) ? combined : null;
}

export type SplitResult =
  | { metadata: string; content: string; error?: undefined }
  | { error: string };

/**
 * Splits an edited combined document back into the two files: the
 * `metadata.tags` lines move into the metadata file (replacing its tags), and
 * the rest is the content file, byte for byte.
 */
export function splitCombined(
  combined: string,
  savedMetadata: string
): SplitResult {
  const doc = YAML.parseDocument(combined, TOLERANT);
  if (doc.errors.length > 0) return { error: doc.errors[0].message };
  const contentMeta = blockMap(doc, 'metadata');
  if (!contentMeta) {
    return { error: '`metadata` must be a block mapping.' };
  }

  const lines = combined.split('\n');
  let block = ['tags: []'];
  let content = combined;
  const tagsPair = findPair(contentMeta, 'tags');
  if (tagsPair) {
    const [s, e] = pairLines(combined, tagsPair);
    const column = columnOf(combined, tagsPair.key.range?.[0] ?? 0);
    block = reindent(lines.slice(s, e + 1), column, 0);
    content = [...lines.slice(0, s), ...lines.slice(e + 1)].join('\n');
  }

  const metaDoc = YAML.parseDocument(savedMetadata, TOLERANT);
  const metaRoot = blockMap(metaDoc);
  if (!metaRoot) return { error: 'The metadata file is not a block mapping.' };
  const metaLines = savedMetadata.split('\n');
  const existing = findPair(metaRoot, 'tags');
  if (existing) {
    const [s, e] = pairLines(savedMetadata, existing);
    metaLines.splice(s, e - s + 1, ...block);
  } else {
    // Keep the trailing newline after the appended block.
    const at = metaLines[metaLines.length - 1] === '' ? -1 : metaLines.length;
    metaLines.splice(at < 0 ? metaLines.length - 1 : at, 0, ...block);
  }

  return { metadata: metaLines.join('\n'), content };
}

/** Parses an edited buffer the way the preview and identity checks need it. */
export function parseTolerant(text: string): unknown {
  return YAML.parse(text, TOLERANT);
}
