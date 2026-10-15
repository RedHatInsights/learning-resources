import YAML from 'yaml';
import {
  BatchPRResource,
  BatchPRResponse,
  CreatorPRWorkspace,
  WorkspaceResourceSnapshot,
} from '../../../utils/createQuickstartPR';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';
import {
  combineFiles,
  parseTolerant,
  setMetadataName,
  splitCombined,
  tagsAlreadyCombined,
} from './combinedYaml';
import { RESOURCE_NAME_PATTERN } from './scaffold';

export const QUICKSTARTS_DIR = 'docs/quickstarts';

/** A real file in the resource directory, as the branch (or base) has it. */
export interface RealFile {
  name: string;
  saved: string;
}

/**
 * How a resource's files map onto its one editor buffer:
 * - `combined`: the content file with the metadata tags merged in, split back
 *   into both files on save (the normal case);
 * - `content` / `metadata`: only that file is edited, as-is. Used when a
 *   resource has a single YAML file or one that cannot be merged losslessly.
 */
export type ResourceLayout = 'combined' | 'content' | 'metadata';

export interface WorkspaceResource {
  /** Directory name under docs/quickstarts/, the resource's identity. */
  name: string;
  path: string;
  layout: ResourceLayout;
  metadata?: RealFile;
  content?: RealFile;
  /**
   * `combined` only: the content file itself holds `metadata.tags` (as the
   * single-resource creator writes it), so saving keeps them there as well
   * as in the metadata file.
   */
  tagsInContent?: boolean;
  /**
   * `content` only: why the metadata file is left out of the editor, when
   * the resource has one.
   */
  metadataSkipped?: 'tags-differ' | 'unmergeable';
  /** Not on the branch yet; the next save creates its directory. */
  isNew: boolean;
  /**
   * The directory the PR renamed the resource from, whether by a save in
   * this session or an earlier one. Taking the resource out of the PR
   * restores that directory too.
   */
  renamedFrom?: string;
  /** The buffer text that corresponds to the saved files. */
  baseline: string;
  /** The author's current text, which may be invalid YAML. */
  buffer: string;
}

/**
 * A resource being deleted from the repository, or already deleted by the PR.
 * Its files are kept as they were before, for review and so undoing is free.
 */
export interface DeletedResource {
  /** The directory the deletion removes. */
  name: string;
  path: string;
  title: string;
  files: RealFile[];
  /**
   * The directory the PR renamed the resource from. It already has no files
   * on the branch, so restoring the resource restores that one instead.
   */
  renamedFrom?: string;
  /** The open resource the deletion closed, so Undo brings its buffer back. */
  closed?: WorkspaceResource;
}

/** The PR a workspace saves to. The PR and its branch are the session. */
export interface WorkspacePR {
  number: number;
  url: string;
  branchName: string;
  headSha: string;
}

export interface WorkspaceState {
  resources: WorkspaceResource[];
  activeName: string | null;
  pr: WorkspacePR | null;
  /**
   * Base-branch commit the first resource was read from. A new PR branches
   * from it, so content merged to main afterwards is never reverted.
   */
  baseSha: string | null;
  /**
   * Branch for the first save, fixed once per workspace so a retry after a
   * failed PR creation reuses it instead of opening a second PR.
   */
  pendingBranchName: string;
  /** Directories the loaded PR touches that could not be read. */
  missing: string[];
  /** Resources the PR changes, as far as this workspace has seen. */
  prResources: string[];
  /**
   * Resources taken out of the workspace that the next save reverts out of
   * the PR. Kept whole so the removal can be undone before saving.
   */
  removals: WorkspaceResource[];
  /** Existing resources the next save deletes from the repository. */
  deletions: DeletedResource[];
  /** Resources the PR already deletes, as saved to its branch. */
  deleted: DeletedResource[];
  /** Saved deletions the next save undoes, bringing the resource back. */
  restorations: DeletedResource[];
}

/** What one save sent for a resource, so only that becomes the baseline. */
export interface SentResource {
  buffer: string;
  /** Saved text by file name, under the names the files have after the save. */
  files: Record<string, string>;
  /** The directory the save moved (or created) the resource under. */
  movedTo?: string;
  /** The content file's name after the save, when the move renamed it. */
  contentName?: string;
}

export type WorkspaceAction =
  | {
      type: 'addResources';
      resources: WorkspaceResourceSnapshot[];
      baseSha?: string;
    }
  | { type: 'createResource'; name: string; buffer: string }
  | { type: 'removeResources'; names: string[] }
  | { type: 'removeFromPR'; names: string[] }
  | { type: 'undoRemoval'; name: string }
  | {
      type: 'deleteResource';
      name: string;
      /** Its files, when it is not open in the workspace. */
      snapshot?: WorkspaceResourceSnapshot;
      baseSha?: string;
    }
  | { type: 'undoDeletion'; name: string }
  | { type: 'restoreDeleted'; name: string }
  | { type: 'undoRestore'; name: string }
  | { type: 'loadPR'; workspace: CreatorPRWorkspace }
  | { type: 'edit'; name: string; buffer: string }
  | { type: 'discard'; name: string }
  | { type: 'setActive'; name: string }
  | {
      type: 'saved';
      response: BatchPRResponse;
      sent: Record<string, SentResource>;
      reverted: string[];
      deleted?: string[];
      restored?: string[];
    };

export const newBranchName = () =>
  `qs-update-batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const emptyWorkspace = (): WorkspaceState => ({
  resources: [],
  activeName: null,
  pr: null,
  baseSha: null,
  pendingBranchName: newBranchName(),
  missing: [],
  prResources: [],
  removals: [],
  deletions: [],
  deleted: [],
  restorations: [],
});

const isYamlName = (name: string) => /\.ya?ml$/i.test(name);
const isMetadataName = (name: string) => /^metadata\.ya?ml$/i.test(name);

/**
 * The content file is found through metadata.name the way the backend seeder
 * does, rather than assuming the directory and file always match.
 */
function pickContentFile<T extends { name: string; content: string }>(
  files: T[],
  metadata: T | undefined
): T | undefined {
  let name: string | undefined;
  try {
    const parsed = metadata && parseTolerant(metadata.content);
    if (typeof (parsed as { name?: unknown })?.name === 'string') {
      name = (parsed as { name: string }).name;
    }
  } catch {
    // Fall through to the first non-metadata file.
  }
  const others = files.filter((f) => !isMetadataName(f.name));
  return (
    (name && others.find((f) => f.name === `${name}.yml`)) ||
    (name && others.find((f) => f.name === `${name}.yaml`)) ||
    others[0]
  );
}

export function resourceFromSnapshot(
  snapshot: WorkspaceResourceSnapshot
): WorkspaceResource | null {
  const files = snapshot.files.filter((f) => isYamlName(f.name));
  const meta = files.find((f) => isMetadataName(f.name));
  const content = pickContentFile(files, meta);
  const base = {
    name: snapshot.name,
    path: snapshot.path,
    isNew: false,
    ...(snapshot.renamedFrom ? { renamedFrom: snapshot.renamedFrom } : {}),
  };

  if (meta && content) {
    const combined = combineFiles(meta.content, content.content);
    if (combined !== null) {
      return {
        ...base,
        layout: 'combined',
        metadata: { name: meta.name, saved: meta.content },
        content: { name: content.name, saved: content.content },
        baseline: combined,
        buffer: combined,
      };
    }
    if (tagsAlreadyCombined(meta.content, content.content)) {
      return {
        ...base,
        layout: 'combined',
        tagsInContent: true,
        metadata: { name: meta.name, saved: meta.content },
        content: { name: content.name, saved: content.content },
        baseline: content.content,
        buffer: content.content,
      };
    }
  }
  const only = content ?? meta;
  if (!only) return null;
  const file = { name: only.name, saved: only.content };
  if (only === content && meta) {
    // Only the content file is edited; the metadata file is kept so the
    // editor can say why it is not part of this view.
    let contentHasTags = false;
    try {
      const parsed = parseTolerant(content.content) as {
        metadata?: { tags?: unknown };
      };
      contentHasTags = parsed?.metadata?.tags !== undefined;
    } catch {
      // Unparseable content cannot be merged either way.
    }
    return {
      ...base,
      layout: 'content',
      content: file,
      metadata: { name: meta.name, saved: meta.content },
      metadataSkipped: contentHasTags ? 'tags-differ' : 'unmergeable',
      baseline: only.content,
      buffer: only.content,
    };
  }
  return {
    ...base,
    layout: only === content ? 'content' : 'metadata',
    ...(only === content ? { content: file } : { metadata: file }),
    baseline: only.content,
    buffer: only.content,
  };
}

/** A deleted resource as the workspace keeps it, from its last known files. */
export function deletedFromSnapshot(
  snapshot: WorkspaceResourceSnapshot
): DeletedResource {
  const resource = resourceFromSnapshot(snapshot);
  return {
    name: snapshot.name,
    path: snapshot.path,
    title: resource ? resourceTitle(resource) : snapshot.name,
    files: snapshot.files.map((f) => ({ name: f.name, saved: f.content })),
  };
}

function deletedFromResource(r: WorkspaceResource): DeletedResource {
  return {
    name: r.name,
    path: r.path,
    title: resourceTitle(r),
    files: [r.metadata, r.content].filter((f): f is RealFile => !!f),
    ...(r.renamedFrom ? { renamedFrom: r.renamedFrom } : {}),
    closed: r,
  };
}

/** The metadata file a brand-new resource is split against. */
export const newMetadataTemplate = (name: string) =>
  `kind: QuickStarts\nname: ${name}\ntags: []\n`;

function addSnapshots(
  state: WorkspaceState,
  snapshots: WorkspaceResourceSnapshot[]
): WorkspaceState {
  const resources = [...state.resources];
  for (const snapshot of snapshots) {
    // Adding a resource that is already open must never replace its buffer.
    if (resources.some((r) => r.name === snapshot.name)) continue;
    const resource = resourceFromSnapshot(snapshot);
    if (resource) resources.push(resource);
  }
  // Adding a resource back replaces a pending removal of it.
  const added = new Set(resources.map((r) => r.name));
  return {
    ...state,
    resources,
    removals: state.removals.filter((r) => !added.has(r.name)),
    activeName: state.activeName ?? resources[0]?.name ?? null,
  };
}

const updateResource = (
  state: WorkspaceState,
  name: string,
  update: (r: WorkspaceResource) => WorkspaceResource
): WorkspaceState => ({
  ...state,
  resources: state.resources.map((r) => (r.name === name ? update(r) : r)),
});

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case 'addResources': {
      const next = addSnapshots(state, action.resources);
      return { ...next, baseSha: state.baseSha ?? action.baseSha ?? null };
    }
    case 'createResource': {
      if (state.resources.some((r) => r.name === action.name)) return state;
      const resource: WorkspaceResource = {
        name: action.name,
        path: `${QUICKSTARTS_DIR}/${action.name}`,
        layout: 'combined',
        metadata: {
          name: 'metadata.yml',
          saved: newMetadataTemplate(action.name),
        },
        content: { name: `${action.name}.yml`, saved: '' },
        isNew: true,
        baseline: action.buffer,
        buffer: action.buffer,
      };
      return {
        ...state,
        resources: [...state.resources, resource],
        activeName: action.name,
      };
    }
    case 'removeResources':
    case 'removeFromPR': {
      const resources = state.resources.filter(
        (r) => !action.names.includes(r.name)
      );
      // Only what the PR actually changes can be reverted out of it.
      const reverted =
        action.type === 'removeFromPR'
          ? state.resources.filter(
              (r) =>
                action.names.includes(r.name) &&
                state.prResources.includes(r.name)
            )
          : [];
      const activeStays = resources.some((r) => r.name === state.activeName);
      return {
        ...state,
        resources,
        removals: [...state.removals, ...reverted],
        activeName: activeStays ? state.activeName : resources[0]?.name ?? null,
      };
    }
    case 'undoRemoval': {
      const restored = state.removals.find((r) => r.name === action.name);
      if (!restored) return state;
      return {
        ...state,
        resources: [...state.resources, restored],
        removals: state.removals.filter((r) => r !== restored),
        activeName: restored.name,
      };
    }
    case 'deleteResource': {
      const open = state.resources.find((r) => r.name === action.name);
      if (open?.isNew) return state;
      const already = [...state.deletions, ...state.deleted];
      if (already.some((d) => d.name === action.name)) return state;
      const deletion = open
        ? deletedFromResource(open)
        : action.snapshot && deletedFromSnapshot(action.snapshot);
      if (!deletion) return state;
      const resources = state.resources.filter((r) => r !== open);
      const activeStays = resources.some((r) => r.name === state.activeName);
      return {
        ...state,
        resources,
        // Deleting supersedes taking its changes out of the PR.
        removals: state.removals.filter((r) => r.name !== action.name),
        deletions: [...state.deletions, deletion],
        activeName: activeStays ? state.activeName : resources[0]?.name ?? null,
        baseSha: state.baseSha ?? action.baseSha ?? null,
      };
    }
    case 'undoDeletion': {
      const deletion = state.deletions.find((d) => d.name === action.name);
      if (!deletion) return state;
      const { closed } = deletion;
      return {
        ...state,
        deletions: state.deletions.filter((d) => d !== deletion),
        ...(closed
          ? {
              resources: [...state.resources, closed],
              activeName: closed.name,
            }
          : {}),
      };
    }
    case 'restoreDeleted':
    case 'undoRestore': {
      const restoring = action.type === 'restoreDeleted';
      const from = restoring ? state.deleted : state.restorations;
      const moved = from.find((d) => d.name === action.name);
      if (!moved) return state;
      const rest = from.filter((d) => d !== moved);
      return restoring
        ? {
            ...state,
            deleted: rest,
            restorations: [...state.restorations, moved],
          }
        : { ...state, restorations: rest, deleted: [...state.deleted, moved] };
    }
    case 'loadPR': {
      const { workspace } = action;
      const loaded = addSnapshots(
        { ...emptyWorkspace(), pendingBranchName: workspace.branchName },
        workspace.resources
      );
      return {
        ...loaded,
        pr: {
          number: workspace.number,
          url: workspace.htmlUrl,
          branchName: workspace.branchName,
          headSha: workspace.headSha,
        },
        missing: workspace.missing,
        deleted: workspace.deleted.map(deletedFromSnapshot),
        prResources: [
          ...workspace.resources.map((r) => r.name),
          ...workspace.deleted.map((r) => r.name),
        ],
      };
    }
    case 'edit':
      return updateResource(state, action.name, (r) =>
        r.buffer === action.buffer ? r : { ...r, buffer: action.buffer }
      );
    case 'discard':
      return updateResource(state, action.name, (r) => ({
        ...r,
        buffer: r.baseline,
      }));
    case 'setActive':
      return state.resources.some((r) => r.name === action.name)
        ? { ...state, activeName: action.name }
        : state;
    case 'saved': {
      const { response, sent, reverted } = action;
      const deleted = action.deleted ?? [];
      const restored = action.restored ?? [];
      // Only what the server acknowledged becomes the baseline; text typed
      // while the save was in flight stays unsaved.
      const resources = state.resources.map((r) => {
        const s = sent[r.name];
        if (!s) return r;
        const saveFile = (f: RealFile | undefined, name = f?.name) =>
          f && name
            ? {
                name,
                saved: s.files[name] !== undefined ? s.files[name] : f.saved,
              }
            : f;
        const moved = s.movedTo !== undefined && s.movedTo !== r.name;
        return {
          ...r,
          ...(moved
            ? {
                name: s.movedTo as string,
                path: `${QUICKSTARTS_DIR}/${s.movedTo}`,
                // A directory that only ever existed in this session has
                // nothing to restore.
                renamedFrom: r.isNew ? undefined : r.renamedFrom ?? r.name,
              }
            : {}),
          isNew: false,
          metadata: saveFile(r.metadata),
          content: saveFile(r.content, s.contentName),
          baseline: s.buffer,
        };
      });
      const savedNames = Object.entries(sent).map(([n, s]) => s.movedTo ?? n);
      const movedFrom = (name: string) => sent[name]?.movedTo ?? name;
      // A saved deletion is known by the directory the base branch has, which
      // for a renamed resource is its old one, as a reloaded PR reports it.
      const nowDeleted = state.deletions
        .filter((d) => deleted.includes(d.name))
        .map(
          ({ closed: _closed, renamedFrom, ...d }): DeletedResource =>
            renamedFrom
              ? {
                  ...d,
                  name: renamedFrom,
                  path: `${QUICKSTARTS_DIR}/${renamedFrom}`,
                }
              : d
        );
      const gone = new Set([...reverted, ...deleted, ...restored]);
      const prResources = [
        ...state.prResources.filter((n) => !gone.has(n)).map(movedFrom),
        ...savedNames.filter(
          (n) => !state.prResources.map(movedFrom).includes(n)
        ),
      ];
      return {
        ...state,
        resources,
        activeName: state.activeName && movedFrom(state.activeName),
        prResources: [
          ...prResources,
          ...nowDeleted
            .map((d) => d.name)
            .filter((n) => !prResources.includes(n)),
        ],
        removals: state.removals.filter((r) => !reverted.includes(r.name)),
        deletions: state.deletions.filter((d) => !deleted.includes(d.name)),
        deleted: [...state.deleted, ...nowDeleted],
        restorations: state.restorations.filter(
          (d) => !restored.includes(d.name)
        ),
        pr: {
          number: response.prNumber,
          url: response.prUrl || state.pr?.url || '',
          branchName: response.branchName,
          headSha: response.headSha,
        },
      };
    }
    default:
      return state;
  }
}

export const isDirty = (r: WorkspaceResource) =>
  r.isNew || r.buffer !== r.baseline;

export const dirtyResources = (state: WorkspaceState) =>
  state.resources.filter(isDirty);

/**
 * Everything the next save would commit: edited resources, removals from the
 * PR, deletions and restorations.
 */
export const pendingCount = (state: WorkspaceState) =>
  dirtyResources(state).length +
  state.removals.length +
  state.deletions.length +
  state.restorations.length;

export const isInPR = (state: WorkspaceState, name: string) =>
  state.prResources.includes(name);

/** One real file a save would write, with its before/after for review. */
export interface FileChange {
  resource: string;
  path: string;
  name: string;
  before: string;
  after: string;
  isNew: boolean;
  /** Where the file was before a rename moved it. */
  previousPath?: string;
}

/** Splits a buffer into the real files it stands for, as they would be saved. */
export function filesForResource(
  r: WorkspaceResource
): { files: Record<string, string>; error?: undefined } | { error: string } {
  if (r.layout !== 'combined') {
    const file = (r.layout === 'content' ? r.content : r.metadata) as RealFile;
    return { files: { [file.name]: r.buffer } };
  }
  const split = splitCombined(
    r.buffer,
    (r.metadata as RealFile).saved,
    r.tagsInContent
  );
  if (split.error !== undefined) return { error: split.error };
  return {
    files: {
      [(r.metadata as RealFile).name]: split.metadata,
      [(r.content as RealFile).name]: split.content,
    },
  };
}

/** Returns the parse error for a text, or null when it is valid YAML. */
export function yamlError(text: string): string | null {
  const doc = YAML.parseDocument(text);
  return doc.errors.length > 0 ? doc.errors[0].message : null;
}

/** The name a parsed buffer declares: metadata.name, or a metadata file's name. */
function declaredName(r: WorkspaceResource, parsed: unknown): unknown {
  const doc = parsed as {
    name?: unknown;
    metadata?: { name?: unknown };
  } | null;
  return r.layout === 'metadata' ? doc?.name : doc?.metadata?.name;
}

const nameField = (r: WorkspaceResource) =>
  r.layout === 'metadata' ? 'name' : 'metadata.name';

function declaredIn(r: WorkspaceResource, text: string): unknown {
  try {
    return declaredName(r, parseTolerant(text));
  } catch {
    return undefined;
  }
}

/** The name the resource had when it was loaded or created. */
const loadedName = (r: WorkspaceResource) =>
  r.isNew ? r.name : declaredIn(r, r.baseline);

/**
 * The name the resource is being renamed to, or null while it keeps its
 * name. A resource's directory is named after its metadata.name, so a new
 * name means the save moves it. Comparing with the loaded name rather than
 * the directory keeps the few older resources whose directory never matched
 * editable without moving them.
 */
export function renameTarget(r: WorkspaceResource): string | null {
  const now = declaredIn(r, r.buffer);
  if (typeof now !== 'string' || !now) return null;
  return now === loadedName(r) ? null : now;
}

/**
 * Problems that would make saving this resource fail or misbehave. Pass the
 * other open resources to also catch two of them claiming the same name.
 */
export function resourceProblem(
  r: WorkspaceResource,
  resources: WorkspaceResource[] = []
): string | null {
  let parsed: unknown;
  try {
    parsed = parseTolerant(r.buffer);
  } catch (err) {
    return (err as Error).message;
  }
  const name = declaredName(r, parsed);
  if (name === loadedName(r)) return null;
  if (typeof name !== 'string' || !name) {
    return `${nameField(r)} is required; it names the resource's folder.`;
  }
  if (!RESOURCE_NAME_PATTERN.test(name)) {
    return `${nameField(
      r
    )} "${name}" can only use lowercase letters, numbers and single dashes, because it is also the folder name.`;
  }
  if (r.layout === 'metadata') {
    return `${r.path} has no content file, so it cannot be renamed here.`;
  }
  if (!r.metadata) {
    return `${r.path} has no metadata.yml, so it cannot be renamed here.`;
  }
  const taken = resources.some(
    (o) => o !== r && (o.name === name || renameTarget(o) === name)
  );
  if (name !== r.name && taken) {
    return `Another open resource is already named "${name}".`;
  }
  return null;
}

export interface BatchSnapshot {
  resources: BatchPRResource[];
  sent: Record<string, SentResource>;
  changes: FileChange[];
  /** Resources the save reverts out of the PR. */
  reverted: WorkspaceResource[];
  /** Existing resources the save moves to a new directory. */
  renamed: { from: string; to: string }[];
  /** Resources the save deletes from the repository. */
  deleted: DeletedResource[];
  /** Saved deletions the save undoes. */
  restored: DeletedResource[];
  problems: { resource: string; message: string }[];
}

const extensionOf = (name: string) => name.match(/\.ya?ml$/i)?.[0] ?? '.yml';

/**
 * Captures exactly what one save will send: every changed file, grouped by
 * resource, with its text at this moment. Only files that actually change are
 * validated strictly, so a pre-existing quirk in an untouched file (real
 * content has duplicate keys) does not block saving the rest.
 */
export function snapshotChanges(state: WorkspaceState): BatchSnapshot {
  const snapshot: BatchSnapshot = {
    resources: [],
    sent: {},
    changes: [],
    reverted: [],
    renamed: [],
    deleted: [],
    restored: [],
    problems: [],
  };

  for (const r of dirtyResources(state)) {
    const problem = resourceProblem(r, state.resources);
    const split = filesForResource(r);
    if (problem || split.error !== undefined) {
      snapshot.problems.push({
        resource: r.name,
        message: problem ?? (split.error as string),
      });
      continue;
    }

    // A new name moves the resource: its metadata file follows the name, and
    // its content file is renamed after it. resourceProblem has made sure
    // both files exist.
    const target = renameTarget(r);
    const dir = target ?? r.name;
    const moves = dir !== r.name;
    const files = { ...split.files };
    let contentName = r.content?.name;
    if (target !== null) {
      const metadata = r.metadata as RealFile;
      const content = r.content as RealFile;
      const renamedMetadata = setMetadataName(
        files[metadata.name] ?? metadata.saved,
        target
      );
      if (renamedMetadata === null) {
        snapshot.problems.push({
          resource: r.name,
          message: `${metadata.name} could not be updated with the new name.`,
        });
        continue;
      }
      files[metadata.name] = renamedMetadata;
      if (moves) {
        contentName = `${target}${extensionOf(content.name)}`;
        files[contentName] = files[content.name] ?? content.saved;
        if (contentName !== content.name) delete files[content.name];
      }
    }

    const real = [r.metadata, r.content].filter((f): f is RealFile => !!f);
    const destName = (f: RealFile) =>
      f === r.content ? (contentName as string) : f.name;
    // A move or a creation sends the resource complete; an edit sends only
    // the files that change.
    const changed = real.filter(
      (f) =>
        files[destName(f)] !== undefined &&
        (r.isNew || moves || files[destName(f)] !== f.saved)
    );
    if (changed.length === 0) continue;

    for (const f of changed) {
      const name = destName(f);
      const error = yamlError(files[name]);
      if (error) {
        snapshot.problems.push({
          resource: r.name,
          message: `${name}: ${error}`,
        });
      }
      snapshot.changes.push({
        resource: r.name,
        path: `${QUICKSTARTS_DIR}/${dir}/${name}`,
        name,
        before: r.isNew ? '' : f.saved,
        after: files[name],
        isNew: r.isNew,
        ...(moves && !r.isNew ? { previousPath: `${r.path}/${f.name}` } : {}),
      });
    }
    snapshot.resources.push({
      name: dir,
      ...(r.isNew ? { create: true } : {}),
      ...(moves && !r.isNew ? { renameFrom: r.name } : {}),
      files: changed.map((f) => ({
        name: destName(f),
        content: files[destName(f)],
      })),
    });
    if (moves && !r.isNew) snapshot.renamed.push({ from: r.name, to: dir });
    snapshot.sent[r.name] = {
      buffer: r.buffer,
      files: Object.fromEntries(
        changed.map((f) => [destName(f), files[destName(f)]])
      ),
      ...(moves ? { movedTo: dir, contentName } : {}),
    };
  }
  const listed = new Set(
    snapshot.resources.flatMap((res) => [res.name, res.renameFrom ?? ''])
  );
  for (const r of state.removals) {
    snapshot.resources.push({ name: r.name, revert: true, files: [] });
    snapshot.reverted.push(r);
    listed.add(r.name);
  }
  // A renamed resource left its old directory deleted in the PR; restore it
  // as well, unless something else in this save already deals with it.
  for (const r of state.removals) {
    if (r.renamedFrom && !listed.has(r.renamedFrom)) {
      snapshot.resources.push({ name: r.renamedFrom, revert: true, files: [] });
      listed.add(r.renamedFrom);
    }
  }
  for (const d of state.deletions) {
    if (listed.has(d.name)) {
      snapshot.problems.push({
        resource: d.name,
        message: 'Another change in this save also uses this folder.',
      });
      continue;
    }
    snapshot.resources.push({ name: d.name, delete: true, files: [] });
    snapshot.deleted.push(d);
    listed.add(d.name);
  }
  // Restoring a saved deletion takes it back out of the PR, which brings its
  // directory back as it was where the branch started.
  for (const d of state.restorations) {
    if (listed.has(d.name)) {
      snapshot.problems.push({
        resource: d.name,
        message: 'Another change in this save also uses this folder.',
      });
      continue;
    }
    snapshot.resources.push({ name: d.name, revert: true, files: [] });
    snapshot.restored.push(d);
    listed.add(d.name);
  }
  return snapshot;
}

export type PreviewResult =
  | { quickStart: ExtendedQuickstart; error?: undefined }
  | { quickStart?: undefined; error: string };

/** Builds the preview for one resource straight from its buffer. */
export function previewForResource(r: WorkspaceResource): PreviewResult {
  if (r.layout === 'metadata') {
    return { error: `${r.path} has no content file to preview.` };
  }
  let parsed: ExtendedQuickstart;
  try {
    parsed = parseTolerant(r.buffer) as ExtendedQuickstart;
  } catch (err) {
    return { error: (err as Error).message };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.spec) {
    return { error: 'The document has no spec to preview.' };
  }
  return {
    quickStart: {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        name: parsed.metadata?.name ?? r.name,
        tags: parsed.metadata?.tags ?? [],
      },
    },
  };
}

const titles = new WeakMap<WorkspaceResource, string>();

/** The resource's display name, falling back to its directory. */
export function resourceTitle(r: WorkspaceResource): string {
  let title = titles.get(r);
  if (title === undefined) {
    try {
      const parsed = parseTolerant(r.buffer) as {
        spec?: { displayName?: unknown };
      };
      title =
        typeof parsed?.spec?.displayName === 'string' && parsed.spec.displayName
          ? parsed.spec.displayName
          : r.name;
    } catch {
      title = r.name;
    }
    titles.set(r, title);
  }
  return title;
}

export function defaultPRBody(state: WorkspaceState, names: string[]) {
  const dirs = state.resources
    .filter((r) => names.includes(r.name))
    .map((r) => {
      const target = renameTarget(r);
      if (!target || target === r.name) {
        return `- ${r.path}/${r.isNew ? ' (new)' : ''}`;
      }
      return r.isNew
        ? `- ${QUICKSTARTS_DIR}/${target}/ (new)`
        : `- ${QUICKSTARTS_DIR}/${target}/ (renamed from ${r.name})`;
    });
  dirs.push(
    ...state.deletions.map((d) => `- ${d.path}/ (deleted)`),
    ...state.restorations.map((d) => `- ${d.path}/ (restored)`)
  );
  return `Updating ${dirs.length} learning resource${
    dirs.length === 1 ? '' : 's'
  } via the Quickstarts Creator tool.\n\nDirectories:\n${dirs.join('\n')}`;
}
