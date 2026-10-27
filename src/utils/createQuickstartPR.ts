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
  const { data } = await axios.get<{ data: CreatorPRContent }>(
    `${API_BASE}/creator-prs/${number}`
  );
  return data.data;
};
