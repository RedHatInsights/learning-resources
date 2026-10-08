import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCreatePR } from './useCreatePR';
import { CreatorWizardContext, ResumePR } from './context';
import {
  createQuickstartPR,
  listRepoQuickstarts,
} from '../../utils/createQuickstartPR';

jest.mock('../../utils/createQuickstartPR', () => ({
  createQuickstartPR: jest.fn(),
  listRepoQuickstarts: jest.fn(),
}));

const mockGetUser = jest.fn().mockResolvedValue({ identity: { user: {} } });
jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  useChrome: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const mockedCreateQuickstartPR = createQuickstartPR as jest.MockedFunction<
  typeof createQuickstartPR
>;
const mockedListRepoQuickstarts = listRepoQuickstarts as jest.MockedFunction<
  typeof listRepoQuickstarts
>;

const FILES = [
  { name: 'metadata.yaml', content: 'name: some-doc\n' },
  { name: 'some-doc.yaml', content: 'metadata:\n  name: some-doc\n' },
];

const renderCreatePR = (quickstartName: string, initialPR: ResumePR | null) => {
  const setResumePR = jest.fn();
  return {
    setResumePR,
    ...renderHook(({ name }) => useCreatePR(name), {
      initialProps: { name: quickstartName },
      wrapper: ({ children }: { children: React.ReactNode }) => {
        const [resumePR, setPR] = React.useState(initialPR);
        return (
          <CreatorWizardContext.Provider
            value={{
              files: FILES,
              onChangeCurrentStage: jest.fn(),
              resetCreator: jest.fn(),
              resumePR,
              setResumePR: (value) => {
                setResumePR(value);
                setPR(value);
              },
            }}
          >
            {children}
          </CreatorWizardContext.Provider>
        );
      },
    }),
  };
};

describe('useCreatePR', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedListRepoQuickstarts.mockResolvedValue([]);
    mockedCreateQuickstartPR.mockResolvedValue({
      prUrl: 'https://github.com/RedHatInsights/quickstarts/pull/1',
      branchName: 'branch',
      commitSha: 'sha',
      status: 'created',
    });
  });

  it('sanitizes the name for a new PR branch, path and title', async () => {
    const { result } = renderCreatePR('My Doc', null);

    await act(async () => {
      await result.current.handleCreatePR();
    });

    await waitFor(() => expect(mockedCreateQuickstartPR).toHaveBeenCalled());
    const metadata = mockedCreateQuickstartPR.mock.calls[0][1];
    expect(metadata.isUpdate).toBe(false);
    expect(metadata.directoryName).toBe('my-doc');
    expect(metadata.branchName).toMatch(/^qs-create-my-doc-\d+$/);
    expect(metadata.prTitle).toBe('feat(quickstarts): create my-doc');
    expect(metadata.existingPath).toBeUndefined();
    expect(metadata.prNumber).toBeUndefined();
  });

  it('reuses the PR branch, number and exact slug when continuing a PR', async () => {
    const { result } = renderCreatePR('some-doc', {
      number: 506,
      branchName: 'qs-create-test-open-pr-editing-1790707280559',
      // The directory that already exists on the PR head. Mixed case on
      // purpose: it must not be case-folded, or the force-push writes a
      // second directory instead of updating this one.
      slug: 'test-open-PR-editing',
    });

    await act(async () => {
      await result.current.handleCreatePR();
    });

    await waitFor(() => expect(mockedCreateQuickstartPR).toHaveBeenCalled());
    // Continuing must not consult main to decide create-vs-update.
    expect(mockedListRepoQuickstarts).not.toHaveBeenCalled();

    const metadata = mockedCreateQuickstartPR.mock.calls[0][1];
    expect(metadata.isUpdate).toBe(true);
    expect(metadata.prNumber).toBe(506);
    expect(metadata.branchName).toBe(
      'qs-create-test-open-pr-editing-1790707280559'
    );
    expect(metadata.directoryName).toBe('test-open-PR-editing');
    expect(metadata.existingPath).toBe(
      'docs/quickstarts/test-open-PR-editing/'
    );
    expect(metadata.prBody).toContain(
      'Directory: docs/quickstarts/test-open-PR-editing/'
    );
    expect(metadata.prTitle).toBe(
      'feat(quickstarts): update test-open-PR-editing'
    );
  });

  it('creates a timestamped update PR for a live document', async () => {
    mockedListRepoQuickstarts.mockResolvedValue([
      { name: 'some-doc', displayName: 'Some Doc' },
    ]);
    const { result } = renderCreatePR('some-doc', null);
    await act(async () => result.current.handleCreatePR());

    expect(mockedCreateQuickstartPR.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        isUpdate: true,
        branchName: expect.stringMatching(/^qs-update-some-doc-\d+$/),
        existingPath: 'docs/quickstarts/some-doc/',
      })
    );
    expect(mockedCreateQuickstartPR.mock.calls[0][1].prNumber).toBeUndefined();
  });

  it('tracks the saved directory when renaming a resumed PR more than once', async () => {
    mockedCreateQuickstartPR.mockResolvedValue({
      prUrl: 'https://github.com/RedHatInsights/quickstarts/pull/507',
      branchName: 'qs-create-old-name-1',
      commitSha: 'sha',
      status: 'updated',
    });
    const { result, rerender, setResumePR } = renderCreatePR('renamed-doc', {
      number: 507,
      branchName: 'qs-create-old-name-1',
      slug: 'old-name',
    });
    await act(async () => result.current.handleCreatePR());

    expect(setResumePR).toHaveBeenLastCalledWith({
      number: 507,
      branchName: 'qs-create-old-name-1',
      slug: 'renamed-doc',
    });

    rerender({ name: 'renamed-again' });
    await act(async () => result.current.handleCreatePR());
    expect(mockedCreateQuickstartPR.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        prNumber: 507,
        branchName: 'qs-create-old-name-1',
        existingPath: 'docs/quickstarts/renamed-doc/',
      })
    );
    expect(result.current.resumePR?.slug).toBe('renamed-again');
  });

  it('updates the PR it just opened on the next save instead of opening another', async () => {
    mockedCreateQuickstartPR.mockResolvedValueOnce({
      prUrl: 'https://github.com/RedHatInsights/quickstarts/pull/512',
      branchName: 'qs-create-my-doc-1',
      commitSha: 'sha',
      status: 'created',
    });
    const { result, setResumePR } = renderCreatePR('my-doc', null);
    await act(async () => result.current.handleCreatePR());

    expect(setResumePR).toHaveBeenLastCalledWith({
      number: 512,
      branchName: 'qs-create-my-doc-1',
      slug: 'my-doc',
    });

    await act(async () => result.current.handleCreatePR());
    expect(mockedCreateQuickstartPR.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        isUpdate: true,
        prNumber: 512,
        branchName: 'qs-create-my-doc-1',
        existingPath: 'docs/quickstarts/my-doc/',
      })
    );
  });
});
