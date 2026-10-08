import YAML from 'yaml';
import {
  BatchPRResource,
  BatchPRResponse,
  CreatorPRWorkspace,
  WorkspaceResourceSnapshot,
} from '../../../utils/createQuickstartPR';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';

/**
 * One real file in the repository. `saved` is what the branch (or base) has;
 * `content` is the author's current text, which may be invalid YAML.
 */
export interface WorkspaceFile {
  path: string;
  name: string;
  resource: string;
  saved: string;
  content: string;
}

export interface WorkspaceResource {
  /** Directory name under docs/quickstarts/, the resource's identity. */
  name: string;
  path: string;
  filePaths: string[];
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
  files: Record<string, WorkspaceFile>;
  activePath: string | null;
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
  /** Directories the loaded PR touches that no longer exist at its head. */
  missing: string[];
}

export type WorkspaceAction =
  | {
      type: 'addResources';
      resources: WorkspaceResourceSnapshot[];
      baseSha?: string;
    }
  | { type: 'loadPR'; workspace: CreatorPRWorkspace }
  | { type: 'edit'; path: string; content: string }
  | { type: 'discard'; paths: string[] }
  | { type: 'setActive'; path: string }
  | {
      type: 'saved';
      response: BatchPRResponse;
      /** The exact text each path was saved with. */
      contents: Record<string, string>;
    }
  | { type: 'reset' };

export const newBranchName = () =>
  `qs-update-batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const emptyWorkspace = (): WorkspaceState => ({
  resources: [],
  files: {},
  activePath: null,
  pr: null,
  baseSha: null,
  pendingBranchName: newBranchName(),
  missing: [],
});

const isYamlName = (name: string) => /\.ya?ml$/i.test(name);
const isMetadataName = (name: string) => /^metadata\.ya?ml$/i.test(name);

function addSnapshots(
  state: WorkspaceState,
  snapshots: WorkspaceResourceSnapshot[]
): WorkspaceState {
  const resources = [...state.resources];
  const files = { ...state.files };
  let activePath = state.activePath;

  for (const snapshot of snapshots) {
    // Adding a resource that is already open must never replace its buffers.
    if (resources.some((r) => r.name === snapshot.name)) continue;

    const yamlFiles = snapshot.files.filter((f) => isYamlName(f.name));
    resources.push({
      name: snapshot.name,
      path: snapshot.path,
      filePaths: sortResourceFiles(yamlFiles.map((f) => f.path)),
    });
    for (const f of yamlFiles) {
      files[f.path] = {
        path: f.path,
        name: f.name,
        resource: snapshot.name,
        saved: f.content,
        content: f.content,
      };
    }
    if (!activePath) {
      activePath = contentFilePath(snapshot.name, files, resources) ?? null;
    }
  }

  return { ...state, resources, files, activePath };
}

/** Metadata first, then the rest by name, so every resource reads the same. */
function sortResourceFiles(paths: string[]): string[] {
  const base = (p: string) => p.slice(p.lastIndexOf('/') + 1);
  return [...paths].sort((a, b) => {
    const am = isMetadataName(base(a));
    const bm = isMetadataName(base(b));
    if (am !== bm) return am ? -1 : 1;
    return base(a).localeCompare(base(b));
  });
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case 'addResources': {
      const next = addSnapshots(state, action.resources);
      return {
        ...next,
        baseSha: state.baseSha ?? action.baseSha ?? null,
      };
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
      };
    }
    case 'edit': {
      const file = state.files[action.path];
      if (!file || file.content === action.content) return state;
      return {
        ...state,
        files: {
          ...state.files,
          [action.path]: { ...file, content: action.content },
        },
      };
    }
    case 'discard': {
      const files = { ...state.files };
      for (const path of action.paths) {
        if (files[path])
          files[path] = { ...files[path], content: files[path].saved };
      }
      return { ...state, files };
    }
    case 'setActive':
      return state.files[action.path]
        ? { ...state, activePath: action.path }
        : state;
    case 'saved': {
      const { response, contents } = action;
      const files = { ...state.files };
      // Only the versions the server acknowledged become the baseline; text
      // typed while the save was in flight stays dirty.
      for (const [path, content] of Object.entries(contents)) {
        if (files[path]) files[path] = { ...files[path], saved: content };
      }
      return {
        ...state,
        files,
        pr: {
          number: response.prNumber,
          url: response.prUrl || state.pr?.url || '',
          branchName: response.branchName,
          headSha: response.headSha,
        },
      };
    }
    case 'reset':
      return emptyWorkspace();
    default:
      return state;
  }
}

export const isDirty = (file: WorkspaceFile) => file.content !== file.saved;

export const dirtyFiles = (state: WorkspaceState) =>
  Object.values(state.files).filter(isDirty);

/** Returns the parse error for a file's current text, or null when valid. */
export function yamlError(content: string): string | null {
  const doc = YAML.parseDocument(content);
  if (doc.errors.length > 0) return doc.errors[0].message;
  return null;
}

/**
 * The resource's content file, found through metadata.name the way the backend
 * seeder does, rather than assuming the directory and file always match.
 */
export function contentFilePath(
  resourceName: string,
  files: Record<string, WorkspaceFile>,
  resources: WorkspaceResource[]
): string | undefined {
  const resource = resources.find((r) => r.name === resourceName);
  if (!resource) return undefined;
  const entries = resource.filePaths.map((p) => files[p]).filter(Boolean);
  const metadata = entries.find((f) => isMetadataName(f.name));
  let name: string | undefined;
  if (metadata) {
    try {
      const parsed = YAML.parse(metadata.content);
      if (typeof parsed?.name === 'string') name = parsed.name;
    } catch {
      // Fall through to the first non-metadata file.
    }
  }
  const byName = name
    ? entries.find((f) => f.name === `${name}.yml` || f.name === `${name}.yaml`)
    : undefined;
  return (byName ?? entries.find((f) => !isMetadataName(f.name)))?.path;
}

export type PreviewResult =
  | { quickStart: ExtendedQuickstart; error?: undefined }
  | { quickStart?: undefined; error: string };

/**
 * Builds the preview for one resource from its current buffers without
 * rewriting either of them: metadata tags are merged in memory only.
 */
export function previewForResource(
  state: WorkspaceState,
  resourceName: string
): PreviewResult {
  const resource = state.resources.find((r) => r.name === resourceName);
  if (!resource) return { error: 'Resource is not in the workspace.' };

  const contentPath = contentFilePath(
    resourceName,
    state.files,
    state.resources
  );
  if (!contentPath)
    return { error: `No content file found in ${resource.path}.` };

  const content = state.files[contentPath];
  let parsed: ExtendedQuickstart;
  try {
    parsed = YAML.parse(content.content);
  } catch (err) {
    return { error: `${content.name}: ${(err as Error).message}` };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.spec) {
    return { error: `${content.name} has no spec to preview.` };
  }

  const metadataFile = resource.filePaths
    .map((p) => state.files[p])
    .find((f) => f && isMetadataName(f.name));
  let tags = parsed.metadata?.tags;
  if (metadataFile) {
    try {
      const meta = YAML.parse(metadataFile.content);
      if (Array.isArray(meta?.tags)) tags = meta.tags;
    } catch (err) {
      return { error: `${metadataFile.name}: ${(err as Error).message}` };
    }
  }

  return {
    quickStart: {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        name: parsed.metadata?.name ?? resourceName,
        tags,
      },
    },
  };
}

export interface BatchSnapshot {
  resources: BatchPRResource[];
  contents: Record<string, string>;
  invalid: { path: string; error: string }[];
}

/**
 * Captures exactly what one save will send: every changed file, grouped by
 * resource, with its text at this moment.
 */
export function snapshotChanges(state: WorkspaceState): BatchSnapshot {
  const resources: BatchPRResource[] = [];
  const contents: Record<string, string> = {};
  const invalid: { path: string; error: string }[] = [];

  for (const resource of state.resources) {
    const changed = resource.filePaths
      .map((p) => state.files[p])
      .filter((f) => f && isDirty(f));
    if (changed.length === 0) continue;

    for (const f of changed) {
      const error = yamlError(f.content);
      if (error) invalid.push({ path: f.path, error });
      contents[f.path] = f.content;
    }
    resources.push({
      name: resource.name,
      files: changed.map((f) => ({ name: f.name, content: f.content })),
    });
  }

  return { resources, contents, invalid };
}

export function defaultPRBody(
  state: WorkspaceState,
  changedResources: string[]
) {
  const dirs = state.resources
    .filter((r) => changedResources.includes(r.name))
    .map((r) => `- ${r.path}/`);
  return `Updating ${dirs.length} learning resource${
    dirs.length === 1 ? '' : 's'
  } via the Quickstarts Creator tool.\n\nDirectories:\n${dirs.join('\n')}`;
}
