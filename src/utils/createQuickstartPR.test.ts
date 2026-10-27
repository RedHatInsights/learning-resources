import axios from 'axios';
import {
  PRFile,
  PRMetadata,
  QuickstartsAPIError,
  createQuickstartPR,
  getCreatorPR,
  getCreatorPRResource,
  getCreatorPRWorkspace,
  getRepoQuickstartContent,
  listCreatorPRs,
  listRepoQuickstarts,
  submitBatchPR,
} from './createQuickstartPR';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_FILES: PRFile[] = [
  {
    name: 'metadata.yaml',
    content: 'kind: QuickStarts\nmetadata:\n  name: my-qs\n',
  },
  { name: 'my-qs.yaml', content: 'spec:\n  displayName: My QS\n' },
];

const MOCK_METADATA: PRMetadata = {
  branchName: 'qs-create-my-qs-1234567890',
  commitMessage: 'feat(quickstarts): add my-qs',
  prTitle: 'feat(quickstarts): add my-qs',
  prBody:
    'Adding new quickstart via the Quickstarts Creator tool.\n\nDirectory: docs/quickstarts/my-qs/',
  isUpdate: false,
  directoryName: 'my-qs',
};

const MOCK_RESPONSE = {
  prUrl: 'https://github.com/org/repo/pull/42',
  branchName: 'qs-create-my-qs-1234567890',
  commitSha: 'abc123def456',
  status: 'created',
};

describe('createQuickstartPR', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs to /api/quickstarts/v1/pull-request with files and metadata', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { data: MOCK_RESPONSE } });

    const result = await createQuickstartPR(MOCK_FILES, MOCK_METADATA);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/quickstarts/v1/pull-request',
      { files: MOCK_FILES, metadata: MOCK_METADATA }
    );
    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('returns the PR URL, branchName, commitSha, and status from the response', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { data: MOCK_RESPONSE } });

    const result = await createQuickstartPR(MOCK_FILES, MOCK_METADATA);

    expect(result.prUrl).toBe('https://github.com/org/repo/pull/42');
    expect(result.branchName).toBe('qs-create-my-qs-1234567890');
    expect(result.commitSha).toBe('abc123def456');
    expect(result.status).toBe('created');
  });

  it('propagates network errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    await expect(createQuickstartPR(MOCK_FILES, MOCK_METADATA)).rejects.toThrow(
      'Network error'
    );
  });

  it('propagates 4xx/5xx errors from the API', async () => {
    const apiError = {
      response: { status: 502, data: { msg: 'git-service unreachable' } },
    };
    mockedAxios.post.mockRejectedValueOnce(apiError);

    await expect(createQuickstartPR(MOCK_FILES, MOCK_METADATA)).rejects.toEqual(
      apiError
    );
  });

  it('sends isUpdate: false for new quickstarts', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { data: MOCK_RESPONSE } });

    await createQuickstartPR(MOCK_FILES, { ...MOCK_METADATA, isUpdate: false });

    const body = mockedAxios.post.mock.calls[0][1] as { metadata: PRMetadata };
    expect(body.metadata.isUpdate).toBe(false);
    expect(body.metadata.existingPath).toBeUndefined();
  });

  it('forwards existingPath and isUpdate: true for updates (48694 path)', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: { ...MOCK_RESPONSE, status: 'updated' } },
    });

    const updateMetadata: PRMetadata = {
      ...MOCK_METADATA,
      isUpdate: true,
      existingPath: 'docs/quickstarts/my-qs/',
    };

    const result = await createQuickstartPR(MOCK_FILES, updateMetadata);

    const body = mockedAxios.post.mock.calls[0][1] as { metadata: PRMetadata };
    expect(body.metadata.isUpdate).toBe(true);
    expect(body.metadata.existingPath).toBe('docs/quickstarts/my-qs/');
    expect(result.status).toBe('updated');
  });
});

describe('listRepoQuickstarts', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GETs /api/quickstarts/v1/repo-quickstarts and returns quickstarts array', async () => {
    const mockQuickstarts = [
      { name: 'getting-started', displayName: 'Getting Started' },
      { name: 'cost-management', displayName: 'Cost Management' },
    ];
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: { quickstarts: mockQuickstarts } },
    });

    const result = await listRepoQuickstarts();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/repo-quickstarts'
    );
    expect(result).toEqual(mockQuickstarts);
    expect(result).toHaveLength(2);
  });

  it('propagates errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    await expect(listRepoQuickstarts()).rejects.toThrow('Network error');
  });
});

describe('listCreatorPRs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GETs /api/quickstarts/v1/creator-prs and returns pullRequests array', async () => {
    const mockPRs = [
      {
        number: 11,
        title: 'feat(quickstarts): create demo',
        htmlUrl: 'https://github.com/org/repo/pull/11',
        branchName: 'qs-create-demo-1',
        slug: 'demo',
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: { pullRequests: mockPRs } },
    });

    const result = await listCreatorPRs();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/creator-prs'
    );
    expect(result).toEqual(mockPRs);
  });
});

describe('getCreatorPR', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GETs /api/quickstarts/v1/creator-prs/{number}', async () => {
    const mockContent = {
      number: 11,
      title: 'feat(quickstarts): create demo',
      htmlUrl: 'https://github.com/org/repo/pull/11',
      branchName: 'qs-create-demo-1',
      slug: 'demo',
      files: [{ name: 'demo.yml', content: 'spec:\n  displayName: Demo\n' }],
    };
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockContent },
    });

    const result = await getCreatorPR(11);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/creator-prs/11'
    );
    expect(result.slug).toBe('demo');
    expect(result.files).toHaveLength(1);
  });
});

describe('getRepoQuickstartContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GETs /api/quickstarts/v1/repo-quickstarts/{name} and returns content', async () => {
    const mockContent = {
      name: 'getting-started',
      files: [
        { name: 'metadata.yaml', content: 'kind: QuickStarts\n' },
        { name: 'getting-started.yml', content: 'spec:\n  displayName: GS\n' },
      ],
    };
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: mockContent },
    });

    const result = await getRepoQuickstartContent('getting-started');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/repo-quickstarts/getting-started'
    );
    expect(result.name).toBe('getting-started');
    expect(result.files).toHaveLength(2);
  });

  it('encodes the quickstart name in the URL', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: { name: 'my qs', files: [] } },
    });

    await getRepoQuickstartContent('my qs');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/repo-quickstarts/my%20qs'
    );
  });

  it('propagates 404 errors', async () => {
    const apiError = {
      response: { status: 404, data: { msg: 'quickstart not found' } },
    };
    mockedAxios.get.mockRejectedValueOnce(apiError);

    await expect(getRepoQuickstartContent('nonexistent')).rejects.toEqual(
      apiError
    );
  });
});

describe('multi-resource API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs changed files per resource to the batch route', async () => {
    const response = {
      prUrl: 'https://github.com/org/repo/pull/7',
      prNumber: 7,
      branchName: 'qs-update-batch-1',
      headSha: 'def',
      status: 'created',
      paths: ['docs/quickstarts/a/a.yml'],
    };
    mockedAxios.post.mockResolvedValueOnce({ data: { data: response } });

    const metadata = {
      branchName: 'qs-update-batch-1',
      commitMessage: 'docs: update links',
      prTitle: 'Update links',
    };
    const resources = [
      { name: 'a', files: [{ name: 'a.yml', content: 'a: 1\n' }] },
    ];
    await expect(submitBatchPR(metadata, resources)).resolves.toEqual(response);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/quickstarts/v1/pull-request/batch',
      { metadata, resources }
    );
  });

  it('keeps the status and server message of a rejected save', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          msg: 'pull request #7 has new commits; reload it before saving',
        },
      },
    });

    const err = await submitBatchPR(
      { prNumber: 7, expectedHeadSha: 'abc', commitMessage: 'x' },
      [{ name: 'a', files: [{ name: 'a.yml', content: '' }] }]
    ).catch((e) => e);
    expect(err).toBeInstanceOf(QuickstartsAPIError);
    expect(err.status).toBe(409);
    expect(err.message).toContain('has new commits');
  });

  it('falls back to a readable message without a server body', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
    const err = await submitBatchPR(
      { prNumber: 7, expectedHeadSha: 'abc', commitMessage: 'x' },
      []
    ).catch((e) => e);
    expect(err.message).toBe('Failed to save changes to PR #7.');
    expect(err.status).toBeUndefined();
  });

  it('loads a PR workspace and defaults missing lists', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: {
          number: 7,
          title: 't',
          htmlUrl: 'u',
          branchName: 'b',
          headSha: 'abc',
        },
      },
    });
    const ws = await getCreatorPRWorkspace(7);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/creator-prs/7/workspace'
    );
    expect(ws.resources).toEqual([]);
    expect(ws.missing).toEqual([]);
  });

  it('pins a resource read to the loaded PR head', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: { headSha: 'abc', resource: { name: 'a b' } } },
    });
    await getCreatorPRResource(7, 'a b', 'abc');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/api/quickstarts/v1/creator-prs/7/resources/a%20b',
      { params: { headSha: 'abc' } }
    );
  });

  it('explains why a multi-resource PR cannot open in the single editor', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          msg: 'pull request changes more than one quickstart; open it with Edit multiple resources',
        },
      },
    });
    const err = await getCreatorPR(7).catch((e) => e);
    expect(err.status).toBe(409);
    expect(err.message).toContain('Edit multiple resources');
  });
});
