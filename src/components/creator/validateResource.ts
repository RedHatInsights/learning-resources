import YAML, { LineCounter, Node, isMap, isScalar, isSeq } from 'yaml';
import { ALL_KIND_ENTRIES } from './meta';

/**
 * Checks a resource's YAML before it is saved, so authors find out in the
 * editor rather than from a failed pull request or a broken deploy.
 *
 * Errors are only what the quickstarts repository rejects: its PR check
 * (`make validate`, cmd/validate/validate_quickstarts.go), the Go types it
 * reads the files into, and the tag kinds its seeder can store. An unknown
 * tag kind passes the PR check but fails the whole content deploy, so it is
 * an error too. Everything else is a warning and never blocks saving.
 */

export type IssueSeverity = 'error' | 'warning';

export interface ResourceIssue {
  severity: IssueSeverity;
  /** Where in the document, e.g. `spec.type.color`; empty for the whole file. */
  field: string;
  message: string;
  /** One-based line the issue points at. */
  line: number;
  /** The saved file already had this error, so it does not block saving. */
  existing?: boolean;
}

/** Which file a buffer is: a content file (tags may be merged in) or metadata.yml. */
export type ResourceFile = 'content' | 'metadata';

/** Directory names the repository and its seeder accept. */
export const RESOURCE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Tag kinds the quickstarts seeder can store (pkg/models/tag.go). */
export const TAG_KINDS = [
  'bundle',
  'application',
  'kind',
  'topic',
  'content',
  'product-families',
  'use-case',
];

/** Card colors the repository check accepts. */
export const TYPE_COLORS = [
  'blue',
  'cyan',
  'green',
  'orange',
  'purple',
  'red',
  'grey',
];

const API_VERSION = 'console.openshift.io/v1';
const TOP_FIELDS = ['apiVersion', 'kind', 'metadata', 'spec'];
const SPEC_FIELDS = [
  'version',
  'displayName',
  'durationMinutes',
  'icon',
  'description',
  'prerequisites',
  'introduction',
  'tasks',
  'conclusion',
  'nextQuickStart',
  'accessReviewResources',
  'link',
  'type',
];
const FLAGS = ['learningPath', 'otherResource', 'instructional'];

const REPO_CHECK = 'The quickstarts repository check rejects the PR otherwise.';

const normalizeLabel = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '');

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

export function validateResource(
  text: string,
  file: ResourceFile
): ResourceIssue[] {
  const counter = new LineCounter();
  const doc = YAML.parseDocument(text, { lineCounter: counter });
  const issues: ResourceIssue[] = [];
  const lineOf = (node: unknown) => {
    const range = (node as Node | null | undefined)?.range;
    return range ? counter.linePos(range[0]).line : 1;
  };
  const add = (
    severity: IssueSeverity,
    field: string,
    message: string,
    at?: unknown
  ) => issues.push({ severity, field, message, line: lineOf(at) });

  for (const error of doc.errors) {
    const line = error.linePos?.[0].line ?? 1;
    const message = error.message
      .split('\n')[0]
      .replace(/ at line \d+, column \d+:?$/, '');
    if (error.code === 'DUPLICATE_KEY') {
      // The repository reads these fine (real content has some), but only
      // one of the values counts.
      issues.push({
        severity: 'warning',
        field: '',
        message: `${message}; only one of the values is used.`,
        line,
      });
    } else {
      issues.push({ severity: 'error', field: '', message, line });
    }
  }
  if (issues.some((i) => i.severity === 'error')) return issues;

  const root = doc.contents;
  if (!isMap(root)) {
    add(
      'error',
      '',
      file === 'metadata'
        ? 'metadata.yml must be a mapping with kind, name and tags.'
        : 'The document must be a mapping with apiVersion, kind, metadata and spec.'
    );
    return issues;
  }

  const node = (path: string[]) => doc.getIn(path, true) as Node | undefined;
  const value = (path: string[]): unknown => {
    const found = node(path);
    return isScalar(found) ? found.value : found;
  };
  const has = (path: string[]) => doc.hasIn(path);
  /** The closest node to point at for a path, present or not. */
  const near = (path: string[]) => {
    for (let n = path.length; n > 0; n--) {
      const found = node(path.slice(0, n));
      if (found) return found;
    }
    return root;
  };

  const checkName = (path: string[]) => {
    const field = path.join('.');
    const name = value(path);
    if (name === null || name === undefined || name === '') {
      add(
        'error',
        field,
        "Required; it is the resource's ID and names its folder.",
        near(path)
      );
    } else if (typeof name !== 'string') {
      add('error', field, 'Must be text.', node(path));
    } else if (!RESOURCE_NAME_PATTERN.test(name)) {
      add(
        'error',
        field,
        `"${name}" can only use lowercase letters, numbers and single dashes, because it is also the folder name.`,
        node(path)
      );
    }
  };

  const checkTags = (path: string[]) => {
    if (!has(path) || value(path) === null) return;
    const field = path.join('.');
    const tags = node(path);
    if (!isSeq(tags)) {
      add('error', field, 'Must be a list of { kind, value } entries.', tags);
      return;
    }
    tags.items.forEach((tag, i) => {
      const at = `${field}[${i}]`;
      if (!isMap(tag)) {
        add('error', at, 'Each tag needs a kind and a value.', tag);
        return;
      }
      const kind = tag.get('kind');
      if (!isText(kind)) {
        add('error', `${at}.kind`, 'Each tag needs a kind.', tag);
      } else if (!TAG_KINDS.includes(kind)) {
        add(
          'error',
          `${at}.kind`,
          `"${kind}" is not a tag kind the quickstarts service knows (${TAG_KINDS.join(
            ', '
          )}). An unknown kind fails the content deploy.`,
          tag.get('kind', true)
        );
      }
      const tagValue = tag.get('value');
      if (tagValue === null || tagValue === undefined || tagValue === '') {
        add('warning', `${at}.value`, 'This tag has no value.', tag);
      }
    });
  };

  if (file === 'metadata') {
    if (value(['kind']) !== 'QuickStarts') {
      add(
        'error',
        'kind',
        `Must be QuickStarts. ${REPO_CHECK}`,
        near(['kind'])
      );
    }
    checkName(['name']);
    checkTags(['tags']);
    return issues;
  }

  // Content file.
  // Fixed values. The repository never reads them from the content file, so
  // a change is flagged but does not block.
  if (has(['apiVersion']) && value(['apiVersion']) !== API_VERSION) {
    add(
      'warning',
      'apiVersion',
      `Should stay ${API_VERSION}.`,
      node(['apiVersion'])
    );
  }
  if (has(['kind']) && value(['kind']) !== 'QuickStarts') {
    add('warning', 'kind', 'Should stay QuickStarts.', node(['kind']));
  }
  for (const pair of root.items) {
    const key = isScalar(pair.key) ? pair.key.value : pair.key;
    if (typeof key === 'string' && !TOP_FIELDS.includes(key)) {
      add('warning', key, 'Unknown field; it is ignored.', pair.key);
    }
  }

  if (!isMap(node(['metadata']))) {
    add(
      'error',
      'metadata',
      has(['metadata'])
        ? 'Must be a mapping with name and tags.'
        : 'Missing; it holds the name and tags.',
      near(['metadata'])
    );
  } else {
    checkName(['metadata', 'name']);
    checkTags(['metadata', 'tags']);
    const external = value(['metadata', 'externalDocumentation']);
    if (external !== undefined && typeof external !== 'boolean') {
      add(
        'error',
        'metadata.externalDocumentation',
        `Must be true or false. ${REPO_CHECK}`,
        node(['metadata', 'externalDocumentation'])
      );
    }
    for (const flag of FLAGS) {
      const flagValue = value(['metadata', flag]);
      if (flagValue !== undefined && typeof flagValue !== 'boolean') {
        add(
          'warning',
          `metadata.${flag}`,
          'Should be true or false.',
          node(['metadata', flag])
        );
      }
    }
  }

  const spec = node(['spec']);
  if (!isMap(spec)) {
    add(
      'error',
      'spec',
      has(['spec'])
        ? 'Must be a mapping.'
        : 'Missing; it holds everything the card and panel show.',
      near(['spec'])
    );
    return issues;
  }

  const displayName = value(['spec', 'displayName']);
  if (!isText(displayName)) {
    add(
      'error',
      'spec.displayName',
      displayName !== undefined && typeof displayName !== 'string'
        ? `Must be text. ${REPO_CHECK}`
        : `Required; it is the title on the card. ${REPO_CHECK}`,
      near(['spec', 'displayName'])
    );
  }

  const description = value(['spec', 'description']);
  if (description !== undefined && typeof description !== 'string') {
    add(
      'error',
      'spec.description',
      `Must be text. ${REPO_CHECK}`,
      node(['spec', 'description'])
    );
  } else if (!isText(description)) {
    add(
      'warning',
      'spec.description',
      'Empty; the card shows no description.',
      near(['spec', 'description'])
    );
  }

  const icon = value(['spec', 'icon']);
  if (icon !== undefined && icon !== null && typeof icon !== 'string') {
    add(
      'error',
      'spec.icon',
      `Must be text or ~. ${REPO_CHECK}`,
      node(['spec', 'icon'])
    );
  }

  const version = value(['spec', 'version']);
  if (version !== undefined && typeof version !== 'number') {
    add(
      'error',
      'spec.version',
      `Must be a number, like 0.1. ${REPO_CHECK}`,
      node(['spec', 'version'])
    );
  }

  let kindMeta: (typeof ALL_KIND_ENTRIES)[number][1] | undefined;
  if (!isMap(node(['spec', 'type']))) {
    add(
      'error',
      'spec.type',
      `Required, with text (the card label) and color. ${REPO_CHECK}`,
      near(['spec', 'type'])
    );
  } else {
    const typeText = value(['spec', 'type', 'text']);
    if (!isText(typeText)) {
      add(
        'error',
        'spec.type.text',
        `Required; it is the label on the card. ${REPO_CHECK}`,
        near(['spec', 'type', 'text'])
      );
    } else {
      kindMeta = ALL_KIND_ENTRIES.find(
        ([, meta]) =>
          normalizeLabel(meta.displayName) === normalizeLabel(typeText)
      )?.[1];
      if (!kindMeta) {
        add(
          'warning',
          'spec.type.text',
          `"${typeText}" is not a type the Creator knows (${ALL_KIND_ENTRIES.map(
            ([, meta]) => meta.displayName
          ).join(', ')}), so filters may not find it.`,
          node(['spec', 'type', 'text'])
        );
      }
    }
    const color = value(['spec', 'type', 'color']);
    if (typeof color !== 'string' || !TYPE_COLORS.includes(color)) {
      add(
        'error',
        'spec.type.color',
        `${
          color === undefined || color === null || color === ''
            ? 'Required'
            : `"${String(color)}" is not allowed`
        }; use one of ${TYPE_COLORS.join(', ')}. ${REPO_CHECK}`,
        near(['spec', 'type', 'color'])
      );
    }
  }

  if (has(['spec', 'link'])) {
    const link = node(['spec', 'link']);
    if (!isMap(link)) {
      add(
        'error',
        'spec.link',
        `Must be a mapping with href and text. ${REPO_CHECK}`,
        link
      );
    } else {
      for (const key of ['href', 'text']) {
        const linkValue = link.get(key);
        if (linkValue !== undefined && typeof linkValue !== 'string') {
          add(
            'error',
            `spec.link.${key}`,
            `Must be text. ${REPO_CHECK}`,
            link.get(key, true)
          );
        }
      }
    }
  }
  if (kindMeta?.fields.url && !isText(value(['spec', 'link', 'href']))) {
    add(
      'warning',
      'spec.link.href',
      'Empty, so the card links nowhere.',
      near(['spec', 'link', 'href'])
    );
  }

  const duration = value(['spec', 'durationMinutes']);
  if (duration !== undefined && typeof duration !== 'number') {
    add(
      'warning',
      'spec.durationMinutes',
      'Should be a number of minutes.',
      node(['spec', 'durationMinutes'])
    );
  }

  if (has(['spec', 'tasks'])) {
    const tasks = node(['spec', 'tasks']);
    if (!isSeq(tasks)) {
      add('warning', 'spec.tasks', 'Should be a list of tasks.', tasks);
    } else {
      tasks.items.forEach((task, i) => {
        if (!isMap(task) || !isText(task.get('title'))) {
          add(
            'warning',
            `spec.tasks[${i}].title`,
            'Each task should have a title; the panel lists tasks by it.',
            task
          );
        }
      });
    }
  }

  for (const pair of spec.items) {
    const key = isScalar(pair.key) ? pair.key.value : pair.key;
    if (typeof key === 'string' && !SPEC_FIELDS.includes(key)) {
      add('warning', `spec.${key}`, 'Unknown field; it is ignored.', pair.key);
    }
  }

  return issues;
}

/**
 * Turns errors the saved file already had into warnings, so authors are
 * never blocked by a problem they did not cause. The PR check still reports
 * them if the repository rejects them.
 */
export function withoutExistingErrors(
  issues: ResourceIssue[],
  saved: ResourceIssue[]
): ResourceIssue[] {
  const before = new Set(
    saved
      .filter((i) => i.severity === 'error')
      .map((i) => `${i.field}\n${i.message}`)
  );
  return issues.map((i) =>
    i.severity === 'error' && before.has(`${i.field}\n${i.message}`)
      ? { ...i, severity: 'warning', existing: true }
      : i
  );
}

export const blockingIssues = (issues: ResourceIssue[]) =>
  issues.filter((i) => i.severity === 'error');
