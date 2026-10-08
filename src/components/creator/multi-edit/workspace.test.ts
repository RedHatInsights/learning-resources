import {
  WorkspaceState,
  contentFilePath,
  dirtyFiles,
  emptyWorkspace,
  previewForResource,
  snapshotChanges,
  workspaceReducer,
  yamlError,
} from './workspace';
import { WorkspaceResourceSnapshot } from '../../../utils/createQuickstartPR';

const INVENTORY: WorkspaceResourceSnapshot = {
  name: 'insights-inventory-workspace',
  path: 'docs/quickstarts/insights-inventory-workspace',
  files: [
    {
      name: 'insights-inventory-workspace.yaml',
      path: 'docs/quickstarts/insights-inventory-workspace/insights-inventory-workspace.yaml',
      content:
        '# keep me\nmetadata:\n  name: insights-inventory-workspace\nspec:\n  displayName: Inventory\n  link:\n    href: https://old.example.com\n',
    },
    {
      name: 'metadata.yml',
      path: 'docs/quickstarts/insights-inventory-workspace/metadata.yml',
      content:
        'kind: QuickStarts\nname: insights-inventory-workspace\ntags:\n  - kind: application\n    value: inventory\n',
    },
  ],
};

const ANSIBLE: WorkspaceResourceSnapshot = {
  name: 'ansible-related-documentation',
  path: 'docs/quickstarts/ansible-related-documentation',
  files: [
    {
      name: 'metadata.yml',
      path: 'docs/quickstarts/ansible-related-documentation/metadata.yml',
      content: 'kind: QuickStarts\nname: ansible-docs\ntags: []\n',
    },
    {
      // Content file named after metadata.name, not the directory.
      name: 'ansible-docs.yml',
      path: 'docs/quickstarts/ansible-related-documentation/ansible-docs.yml',
      content:
        'metadata:\n  name: ansible-docs\nspec:\n  displayName: Ansible\n',
    },
    {
      name: 'README.md',
      path: 'docs/quickstarts/ansible-related-documentation/README.md',
      content: 'not editable',
    },
  ],
};

const INV_CONTENT = INVENTORY.files[0].path;
const INV_META = INVENTORY.files[1].path;
const ANS_CONTENT = ANSIBLE.files[1].path;

const withResources = (): WorkspaceState =>
  workspaceReducer(emptyWorkspace(), {
    type: 'addResources',
    resources: [INVENTORY, ANSIBLE],
    baseSha: 'base-1',
  });

describe('workspaceReducer', () => {
  it('adds resources keyed by full path, metadata first, YAML only', () => {
    const state = withResources();
    expect(state.resources.map((r) => r.name)).toEqual([
      'insights-inventory-workspace',
      'ansible-related-documentation',
    ]);
    expect(state.resources[0].filePaths).toEqual([INV_META, INV_CONTENT]);
    expect(state.resources[1].filePaths).toHaveLength(2);
    expect(Object.keys(state.files)).toHaveLength(4);
    expect(state.activePath).toBe(INV_CONTENT);
    expect(state.baseSha).toBe('base-1');
  });

  it('keeps edited buffers when the same resource is added again', () => {
    let state = withResources();
    state = workspaceReducer(state, {
      type: 'edit',
      path: INV_CONTENT,
      content: 'spec: [unclosed',
    });
    state = workspaceReducer(state, {
      type: 'addResources',
      resources: [INVENTORY],
      baseSha: 'base-2',
    });
    expect(state.files[INV_CONTENT].content).toBe('spec: [unclosed');
    expect(state.baseSha).toBe('base-1');
  });

  it('tracks dirty state per file and discards back to the saved text', () => {
    let state = withResources();
    state = workspaceReducer(state, {
      type: 'edit',
      path: INV_CONTENT,
      content: 'x: 1\n',
    });
    expect(dirtyFiles(state).map((f) => f.path)).toEqual([INV_CONTENT]);

    state = workspaceReducer(state, { type: 'discard', paths: [INV_CONTENT] });
    expect(dirtyFiles(state)).toEqual([]);
  });

  it('adopts the PR from the first save and only clears acknowledged text', () => {
    let state = withResources();
    state = workspaceReducer(state, {
      type: 'edit',
      path: INV_CONTENT,
      content: 'a: 1\n',
    });
    const sent = { [INV_CONTENT]: 'a: 1\n' };
    // The author keeps typing while the save is in flight.
    state = workspaceReducer(state, {
      type: 'edit',
      path: INV_CONTENT,
      content: 'a: 2\n',
    });
    state = workspaceReducer(state, {
      type: 'saved',
      contents: sent,
      response: {
        prUrl: 'https://github.com/o/r/pull/7',
        prNumber: 7,
        branchName: state.pendingBranchName,
        headSha: 'head-1',
        status: 'created',
        paths: [INV_CONTENT],
      },
    });

    expect(state.pr).toEqual({
      number: 7,
      url: 'https://github.com/o/r/pull/7',
      branchName: expect.stringMatching(/^qs-update-batch-/),
      headSha: 'head-1',
    });
    expect(state.files[INV_CONTENT].saved).toBe('a: 1\n');
    expect(dirtyFiles(state).map((f) => f.path)).toEqual([INV_CONTENT]);
  });

  it('loads a PR as the saved baseline', () => {
    const state = workspaceReducer(withResources(), {
      type: 'loadPR',
      workspace: {
        number: 9,
        title: 'Update docs',
        htmlUrl: 'u',
        branchName: 'qs-update-batch-1',
        headSha: 'head-9',
        resources: [ANSIBLE],
        missing: ['gone'],
      },
    });
    expect(state.resources.map((r) => r.name)).toEqual([
      'ansible-related-documentation',
    ]);
    expect(state.pr?.headSha).toBe('head-9');
    expect(state.missing).toEqual(['gone']);
    expect(dirtyFiles(state)).toEqual([]);
    expect(state.activePath).toBe(ANS_CONTENT);
  });
});

describe('contentFilePath', () => {
  it('follows metadata.name to the content file', () => {
    const state = withResources();
    expect(
      contentFilePath(
        'ansible-related-documentation',
        state.files,
        state.resources
      )
    ).toBe(ANS_CONTENT);
  });
});

describe('previewForResource', () => {
  it('merges metadata tags in memory without touching the buffers', () => {
    const state = withResources();
    const before = JSON.stringify(state.files);
    const preview = previewForResource(state, 'insights-inventory-workspace');
    expect(preview.error).toBeUndefined();
    expect(preview.quickStart?.metadata.tags).toEqual([
      { kind: 'application', value: 'inventory' },
    ]);
    expect(JSON.stringify(state.files)).toBe(before);
  });

  it('reports a parse error instead of previewing stale content', () => {
    const state = workspaceReducer(withResources(), {
      type: 'edit',
      path: INV_CONTENT,
      content: 'spec: [unclosed',
    });
    const preview = previewForResource(state, 'insights-inventory-workspace');
    expect(preview.quickStart).toBeUndefined();
    expect(preview.error).toContain('insights-inventory-workspace.yaml');
  });
});

describe('snapshotChanges', () => {
  it('sends only changed files, exactly as typed, grouped by resource', () => {
    let state = withResources();
    const edited = INVENTORY.files[0].content.replace(
      'https://old.example.com',
      'https://new.example.com'
    );
    state = workspaceReducer(state, {
      type: 'edit',
      path: INV_CONTENT,
      content: edited,
    });

    const snap = snapshotChanges(state);
    expect(snap.resources).toEqual([
      {
        name: 'insights-inventory-workspace',
        files: [{ name: 'insights-inventory-workspace.yaml', content: edited }],
      },
    ]);
    expect(snap.contents).toEqual({ [INV_CONTENT]: edited });
    expect(snap.invalid).toEqual([]);
    // Comments and extensions survive untouched.
    expect(snap.resources[0].files[0].content).toContain('# keep me');
  });

  it('collects every invalid file', () => {
    let state = withResources();
    state = workspaceReducer(state, {
      type: 'edit',
      path: INV_META,
      content: 'a: [b',
    });
    state = workspaceReducer(state, {
      type: 'edit',
      path: ANS_CONTENT,
      content: 'c: : d',
    });
    expect(snapshotChanges(state).invalid.map((i) => i.path)).toEqual([
      INV_META,
      ANS_CONTENT,
    ]);
  });
});

describe('yamlError', () => {
  it('returns null for valid YAML and a message otherwise', () => {
    expect(yamlError('a: 1\n')).toBeNull();
    expect(yamlError('a: [b')).toEqual(expect.any(String));
  });
});
