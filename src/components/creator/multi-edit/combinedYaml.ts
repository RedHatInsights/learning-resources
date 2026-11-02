import YAML, {
  LineCounter,
  Node,
  Pair,
  Scalar,
  YAMLMap,
  isMap,
  isScalar,
} from 'yaml';

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

// The yaml package keeps its own findPair internal, and map.get() returns the
// value node, while the text surgery here needs the key's position too.
const findPair = (map: YAMLMap, key: string): Pair<Node, Node> | undefined =>
  map.items.find((p) => isScalar(p.key) && p.key.value === key) as
    | Pair<Node, Node>
    | undefined;

/** A parsed document plus zero-based line/column lookups into its text. */
interface Parsed {
  text: string;
  doc: YAML.Document.Parsed;
  line: (offset: number) => number;
  column: (offset: number) => number;
}

function parse(text: string): Parsed {
  const counter = new LineCounter();
  const doc = YAML.parseDocument(text, { ...TOLERANT, lineCounter: counter });
  return {
    text,
    doc,
    line: (offset) => counter.linePos(offset).line - 1,
    column: (offset) => counter.linePos(offset).col - 1,
  };
}

/** The whole lines a map entry spans, from its key to the end of its value. */
function pairLines(
  { text, line }: Parsed,
  pair: Pair<Node, Node>
): [number, number] {
  const start = pair.key.range?.[0] ?? 0;
  let end = pair.value?.range?.[1] ?? pair.key.range?.[1] ?? start;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return [line(start), line(Math.max(start, end - 1))];
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
  const meta = parse(metadataText);
  const content = parse(contentText);
  const metaDoc = meta.doc;
  const contentDoc = content.doc;
  if (metaDoc.errors.length > 0 || contentDoc.errors.length > 0) return null;

  const metaRoot = blockMap(metaDoc);
  const contentMeta = blockMap(contentDoc, 'metadata');
  if (!metaRoot || !contentMeta || contentMeta.items.length === 0) return null;
  if (findPair(contentMeta, 'tags')) return null;

  const tagsPair = findPair(metaRoot, 'tags');
  let block = ['tags: []'];
  if (tagsPair) {
    const [s, e] = pairLines(meta, tagsPair);
    const column = meta.column(tagsPair.key.range?.[0] ?? 0);
    block = reindent(metadataText.split('\n').slice(s, e + 1), column, 0);
  }

  const first = contentMeta.items[0] as Pair<Node, Node>;
  const last = contentMeta.items[contentMeta.items.length - 1] as Pair<
    Node,
    Node
  >;
  const indent = content.column(first.key.range?.[0] ?? 0);
  const [, insertAfter] = pairLines(content, last);

  const lines = contentText.split('\n');
  lines.splice(insertAfter + 1, 0, ...reindent(block, 0, indent));
  const combined = lines.join('\n');

  // Trust the text surgery only when it means exactly what the files mean.
  const expected = contentDoc.toJS();
  expected.metadata = { ...expected.metadata, tags: metaDoc.toJS().tags ?? [] };
  const actual = YAML.parse(combined, TOLERANT);
  return sameValue(actual, expected) ? combined : null;
}

/**
 * Whether the content file already carries exactly the metadata file's tags
 * under `metadata.tags`. The single-resource creator writes resources this
 * way, so the content file is the combined document as it stands; saving
 * keeps the tags in it and mirrors them into the metadata file.
 */
export function tagsAlreadyCombined(
  metadataText: string,
  contentText: string
): boolean {
  const metaDoc = YAML.parseDocument(metadataText, TOLERANT);
  const contentDoc = YAML.parseDocument(contentText, TOLERANT);
  if (metaDoc.errors.length > 0 || contentDoc.errors.length > 0) return false;
  const contentMeta = blockMap(contentDoc, 'metadata');
  if (!blockMap(metaDoc) || !contentMeta || !findPair(contentMeta, 'tags')) {
    return false;
  }
  return sameValue(
    contentDoc.toJS().metadata.tags ?? [],
    metaDoc.toJS().tags ?? []
  );
}

export type SplitResult =
  | { metadata: string; content: string; error?: undefined }
  | { error: string };

/**
 * Splits an edited combined document back into the two files: the
 * `metadata.tags` lines move into the metadata file (replacing its tags), and
 * the rest is the content file, byte for byte. With `tagsInContent` the
 * content file keeps its tags too (see tagsAlreadyCombined). The metadata
 * file is returned untouched while its tags block reads the same as the
 * buffer's.
 */
export function splitCombined(
  combined: string,
  savedMetadata: string,
  tagsInContent = false
): SplitResult {
  const parsed = parse(combined);
  const { doc } = parsed;
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
    const [s, e] = pairLines(parsed, tagsPair);
    const column = parsed.column(tagsPair.key.range?.[0] ?? 0);
    block = reindent(lines.slice(s, e + 1), column, 0);
    content = [...lines.slice(0, s), ...lines.slice(e + 1)].join('\n');
  }

  if (tagsInContent) content = combined;

  const meta = parse(savedMetadata);
  const metaDoc = meta.doc;
  const metaRoot = blockMap(metaDoc);
  if (!metaRoot) return { error: 'The metadata file is not a block mapping.' };
  const tags = (YAML.parse(block.join('\n'), TOLERANT) as { tags?: unknown })
    ?.tags;
  const sameTags = sameValue(tags ?? [], metaDoc.toJS().tags ?? []);
  const metaLines = savedMetadata.split('\n');
  const existing = findPair(metaRoot, 'tags');
  if (existing) {
    const [s, e] = pairLines(meta, existing);
    const column = meta.column(existing.key.range?.[0] ?? 0);
    const current = reindent(metaLines.slice(s, e + 1), column, 0);
    // Same tags written differently (a comment, quoting) is still an edit,
    // unless the content file is where this buffer's tag text lives.
    if (sameTags && (tagsInContent || sameValue(current, block))) {
      return { metadata: savedMetadata, content };
    }
    metaLines.splice(s, e - s + 1, ...block);
  } else if (sameTags) {
    return { metadata: savedMetadata, content };
  } else {
    // Keep the trailing newline after the appended block.
    const at = metaLines[metaLines.length - 1] === '' ? -1 : metaLines.length;
    metaLines.splice(at < 0 ? metaLines.length - 1 : at, 0, ...block);
  }

  return { metadata: metaLines.join('\n'), content };
}

/**
 * Sets the top-level `name` of a metadata file, changing only that value so
 * the rest of the file keeps its bytes. Returns null when the file is not a
 * block mapping it can safely edit, or the current name is empty or a block
 * scalar.
 */
export function setMetadataName(text: string, name: string): string | null {
  const parsed = parse(text);
  const { doc } = parsed;
  const root = doc.errors.length === 0 ? blockMap(doc) : null;
  if (!root) return null;
  const pair = findPair(root, 'name');
  let next: string;
  const value = pair?.value;
  if (pair && isScalar(value) && value.range && isInlineName(value)) {
    const [start, end] = value.range;
    next = text.slice(0, start) + name + text.slice(end);
  } else if (!pair && root.items.length > 0) {
    const first = root.items[0] as Pair<Node, Node>;
    const at = first.key.range?.[0] ?? 0;
    const lines = text.split('\n');
    lines.splice(
      parsed.line(at),
      0,
      `${' '.repeat(parsed.column(at))}name: ${name}`
    );
    next = lines.join('\n');
  } else {
    return null;
  }
  // Anything the splice got wrong reads back as a different name, or not at
  // all; the caller reports null instead of crashing the page.
  try {
    const result = YAML.parse(next, TOLERANT) as { name?: unknown } | null;
    return result?.name === name ? next : null;
  } catch {
    return null;
  }
}

/** A non-empty one-line name, which a splice can replace in place. */
const isInlineName = (value: Scalar) =>
  value.source !== '' &&
  value.type !== Scalar.BLOCK_FOLDED &&
  value.type !== Scalar.BLOCK_LITERAL;

/** Parses an edited buffer the way the preview and identity checks need it. */
export function parseTolerant(text: string): unknown {
  return YAML.parse(text, TOLERANT);
}
