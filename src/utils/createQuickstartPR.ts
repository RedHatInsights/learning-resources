import axios from 'axios';

export const API_BASE = '/api/quickstarts/v1';

export interface PRFile {
  name: string;
  content: string;
}

export interface PRMetadata {
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  isUpdate: boolean;
  existingPath?: string;
  directoryName?: string;
  prNumber?: number;
}

export interface PRResponse {
  prUrl: string;
  branchName: string;
  commitSha: string;
  status: string;
}

export const quickstartExists = async (name: string): Promise<boolean> => {
  if (!name || name === 'untitled-quickstart') return false;
  const { data } = await axios.get<{ data: { content: unknown }[] }>(
    `${API_BASE}/quickstarts`,
    { params: { name, limit: 1 } }
  );
  return data.data.length > 0;
};

export const createQuickstartPR = async (
  files: PRFile[],
  metadata: PRMetadata
): Promise<PRResponse> => {
  const { data } = await axios.post<{ data: PRResponse }>(
    `${API_BASE}/pull-request`,
    { files, metadata }
  );
  return data.data;
};

export interface RepoQuickstartEntry {
  name: string;
  displayName: string;
}

export interface RepoQuickstartContent {
  name: string;
  files: PRFile[];
  /** Base-branch commit the files were read from. */
  headSha?: string;
}

export const listRepoQuickstarts = async (): Promise<RepoQuickstartEntry[]> => {
  const { data } = await axios.get<{
    data: { quickstarts: RepoQuickstartEntry[] };
  }>(`${API_BASE}/repo-quickstarts`);
  return data.data?.quickstarts ?? [];
};

export const getRepoQuickstartContent = async (
  name: string
): Promise<RepoQuickstartContent> => {
  const { data } = await axios.get<{ data: RepoQuickstartContent }>(
    `${API_BASE}/repo-quickstarts/${encodeURIComponent(name)}`
  );
  return data.data;
};

export interface CreatorPREntry {
  number: number;
  title: string;
  htmlUrl: string;
  updatedAt?: string;
  branchName: string;
  slug: string;
}

export interface CreatorPRContent {
  number: number;
  title: string;
  htmlUrl: string;
  branchName: string;
  slug: string;
  files: PRFile[];
}

export const listCreatorPRs = async (): Promise<CreatorPREntry[]> => {
  const { data } = await axios.get<{
    data: { pullRequests: CreatorPREntry[] };
  }>(`${API_BASE}/creator-prs`);
  return data.data?.pullRequests ?? [];
};

export const getCreatorPR = async (
  number: number
): Promise<CreatorPRContent> => {
  try {
    const { data } = await axios.get<{ data: CreatorPRContent }>(
      `${API_BASE}/creator-prs/${number}`
    );
    return data.data;
  } catch (err) {
    // A PR spanning several resources is refused with 409 and a message
    // pointing at the multi-resource editor; surface it as-is.
    throw toAPIError(err, `Failed to load pull request #${number}.`);
  }
};

export interface ResourceFile {
  name: string;
  /** Repository-relative path, e.g. docs/quickstarts/foo/metadata.yml */
  path: string;
  content: string;
}

export interface WorkspaceResourceSnapshot {
  /** Quickstart directory name under docs/quickstarts/. */
  name: string;
  /** Repository-relative directory path. */
  path: string;
  files: ResourceFile[];
}

export interface CreatorPRWorkspace {
  number: number;
  title: string;
  htmlUrl: string;
  branchName: string;
  headSha: string;
  resources: WorkspaceResourceSnapshot[];
  /** Directories the PR touches that no longer exist at its head. */
  missing: string[];
}

export interface BatchPRMetadata {
  /** Existing creator PR to append a commit to; omit to open a new PR. */
  prNumber?: number;
  /** PR head the edits were made against. Required with prNumber. */
  expectedHeadSha?: string;
  /** New branch for a first save. Reusing it retries a save whose PR failed. */
  branchName?: string;
  /** Base-branch commit the files were read from. */
  baseSha?: string;
  commitMessage: string;
  prTitle?: string;
  prBody?: string;
  userEmail?: string;
}

export interface BatchPRResource {
  name: string;
  /**
   * The resource does not exist yet; its directory is created and all of its
   * files are sent. Without it, the directory must already exist.
   */
  create?: boolean;
  /** Changed files only; files that are not sent stay untouched. */
  files: PRFile[];
}

export interface BatchPRResponse {
  prUrl: string;
  prNumber: number;
  branchName: string;
  headSha: string;
  status: 'created' | 'updated';
  paths: string[];
}

/** A rejected request with the status and message the API returned. */
export class QuickstartsAPIError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'QuickstartsAPIError';
  }
}

const toAPIError = (err: unknown, fallback: string): QuickstartsAPIError => {
  const response = (
    err as { response?: { status?: number; data?: { msg?: string } } }
  )?.response;
  return new QuickstartsAPIError(
    response?.data?.msg || fallback,
    response?.status
  );
};

export const getCreatorPRWorkspace = async (
  number: number
): Promise<CreatorPRWorkspace> => {
  try {
    const { data } = await axios.get<{ data: CreatorPRWorkspace }>(
      `${API_BASE}/creator-prs/${number}/workspace`
    );
    return {
      ...data.data,
      resources: data.data.resources ?? [],
      missing: data.data.missing ?? [],
    };
  } catch (err) {
    throw toAPIError(err, `Failed to load pull request #${number}.`);
  }
};

export const getCreatorPRResource = async (
  number: number,
  name: string,
  headSha?: string
): Promise<{ headSha: string; resource: WorkspaceResourceSnapshot }> => {
  try {
    const { data } = await axios.get<{
      data: { headSha: string; resource: WorkspaceResourceSnapshot };
    }>(
      `${API_BASE}/creator-prs/${number}/resources/${encodeURIComponent(name)}`,
      headSha ? { params: { headSha } } : undefined
    );
    return data.data;
  } catch (err) {
    throw toAPIError(
      err,
      `Failed to load ${name} from pull request #${number}.`
    );
  }
};

export const submitBatchPR = async (
  metadata: BatchPRMetadata,
  resources: BatchPRResource[]
): Promise<BatchPRResponse> => {
  try {
    const { data } = await axios.post<{ data: BatchPRResponse }>(
      `${API_BASE}/pull-request/batch`,
      { metadata, resources }
    );
    return data.data;
  } catch (err) {
    throw toAPIError(
      err,
      metadata.prNumber
        ? `Failed to save changes to PR #${metadata.prNumber}.`
        : 'Failed to create PR.'
    );
  }
};
