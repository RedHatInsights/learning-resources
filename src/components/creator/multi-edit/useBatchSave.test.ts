import { act, renderHook } from '@testing-library/react';
import { useBatchSave } from './useBatchSave';
import { emptyWorkspace, workspaceReducer } from './workspace';
import { scaffoldResource } from './scaffold';
import { submitBatchPR } from '../../../utils/createQuickstartPR';

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  useChrome: () => ({ auth: { getUser: jest.fn().mockResolvedValue(null) } }),
}));

jest.mock('../../../utils/createQuickstartPR', () => ({
  ...jest.requireActual('../../../utils/createQuickstartPR'),
  submitBatchPR: jest.fn(),
}));

const submit = submitBatchPR as jest.Mock;

describe('useBatchSave', () => {
  it('sends one batch when save is called twice before re-rendering', async () => {
    let resolve!: (value: unknown) => void;
    submit.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const state = workspaceReducer(emptyWorkspace(), {
      type: 'createResource',
      name: 'demo',
      buffer: scaffoldResource({
        kind: 'documentation',
        name: 'demo',
        title: 'Demo',
        description: 'A demo.',
        url: 'https://example.com',
        bundles: ['insights'],
      }),
    });
    const { result } = renderHook(() => useBatchSave(state, jest.fn()));

    let second: boolean | undefined;
    await act(async () => {
      const first = result.current.save({ commitMessage: 'Add demo' });
      second = await result.current.save({ commitMessage: 'Add demo' });
      resolve({
        prUrl: 'https://github.com/o/r/pull/1',
        prNumber: 1,
        branchName: 'b',
        headSha: 'h',
        status: 'created',
        paths: [],
      });
      await first;
    });

    expect(second).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
