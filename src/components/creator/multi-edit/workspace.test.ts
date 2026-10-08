import {
  WorkspaceState,
  defaultPRBody,
  dirtyResources,
  emptyWorkspace,
  previewForResource,
  resourceFromSnapshot,
  resourceProblem,
  resourceTitle,
  snapshotChanges,
  workspaceReducer,
} from './workspace';
import { scaffoldResource } from './scaffold';
import { WorkspaceResourceSnapshot } from '../../../utils/createQuickstartPR';

const metadataFor = (name: string) =>
  `kind: QuickStarts\nname: ${name}\ntags:\n- kind: bundle\n  value: insights\n`;
const contentFor = (name: string) =>
  `# keep me\nmetadata:\n  name: ${name}\nspec:\n  displayName: ${name} title\n  link:\n    href: https://old.example.com/${name}\n`;

const snapshot = (
  name: string,
  files?: { name: string; content: string }[]
): WorkspaceResourceSnapshot => {
  const dir = `docs/quickstarts/${name}`;
  return {
    name,
    path: dir,
    files: (
      files ?? [
        { name: 'metadata.yml', content: metadataFor(name) },
        { name: `${name}.yaml`, content: contentFor(name) },
      ]
    ).map((f) => ({ ...f, path: `${dir}/${f.name}` })),
  };
};

const withResources = (...names: string[]): WorkspaceState =>
  workspaceReducer(emptyWorkspace(), {
    type: 'addResources',
    resources: names.map((n) => snapshot(n)),
    baseSha: 'base-1',
  });

const bufferOf = (state: WorkspaceState, name: string) =>
  state.resources.find((r) => r.name === name)?.buffer as string;

const edit = (state: WorkspaceState, name: string, from: string, to: string) =>
  workspaceReducer(state, {
    type: 'edit',
    name,
    buffer: bufferOf(state, name).replace(from, to),
  });

describe('resourceFromSnapshot', () => {
  it('merges metadata and content into one buffer', () => {
    const r = resourceFromSnapshot(snapshot('alpha'));
    expect(r?.layout).toBe('combined');
    expect(r?.buffer).toContain('  name: alpha\n  tags:\n  - kind: bundle\n');
    expect(r?.content?.name).toBe('alpha.yaml');
  });

  it('finds the content file through metadata.name', () => {
    const r = resourceFromSnapshot(
      snapshot('dir-name', [
        { name: 'metadata.yml', content: metadataFor('real') },
        { name: 'aaa.yml', content: contentFor('other') },
        { name: 'real.yml', content: contentFor('real') },
      ])
    );
    expect(r?.content?.name).toBe('real.yml');
  });

  it('edits a lone file as-is and skips a resource with no YAML', () => {
    const lone = resourceFromSnapshot(
      snapshot('gamma', [{ name: 'gamma.yml', content: contentFor('gamma') }])
    );
    expect(lone?.layout).toBe('content');
    expect(lone?.buffer).toBe(contentFor('gamma'));
    expect(
      resourceFromSnapshot(snapshot('x', [{ name: 'README.md', content: '' }]))
    ).toBeNull();
  });
});

describe('workspaceReducer', () => {
  it('adds resources once, keeping existing buffers and the first base', () => {
    let state = withResources('alpha');
    state = edit(state, 'alpha', 'old.example', 'new.example');
    state = workspaceReducer(state, {
      type: 'addResources',
      resources: [snapshot('alpha'), snapshot('beta')],
      baseSha: 'base-2',
    });
    expect(state.resources.map((r) => r.name)).toEqual(['alpha', 'beta']);
    expect(bufferOf(state, 'alpha')).toContain('new.example');
    expect(state.baseSha).toBe('base-1');
    expect(state.activeName).toBe('alpha');
  });

  it('removes resources and moves the selection off a removed one', () => {
    let state = withResources('alpha', 'beta', 'gamma');
    state = workspaceReducer(state, { type: 'setActive', name: 'beta' });
    state = workspaceReducer(state, {
      type: 'removeResources',
      names: ['beta'],
    });
    expect(state.resources.map((r) => r.name)).toEqual(['alpha', 'gamma']);
    expect(state.activeName).toBe('alpha');
  });

  it('discards back to the saved text', () => {
    let state = edit(withResources('alpha'), 'alpha', 'old', 'new');
    expect(dirtyResources(state)).toHaveLength(1);
    state = workspaceReducer(state, { type: 'discard', name: 'alpha' });
    expect(dirtyResources(state)).toHaveLength(0);
  });

  it('creates a new resource that is unsaved until the server takes it', () => {
    const buffer = scaffoldResource({
      kind: 'documentation',
      name: 'fresh',
      title: 'Fresh',
      description: '',
      url: 'https://docs.example.com',
      bundles: ['insights'],
    });
    let state = workspaceReducer(withResources('alpha'), {
      type: 'createResource',
      name: 'fresh',
      buffer,
    });
    const fresh = state.resources.find((r) => r.name === 'fresh');
    expect(fresh).toMatchObject({
      isNew: true,
      path: 'docs/quickstarts/fresh',
    });
    expect(state.activeName).toBe('fresh');
    expect(dirtyResources(state).map((r) => r.name)).toEqual(['fresh']);

    // A second create with the same name is ignored.
    state = workspaceReducer(state, {
      type: 'createResource',
      name: 'fresh',
      buffer: 'x',
    });
    expect(state.resources).toHaveLength(2);
  });

  it('marks only what a save sent as saved', () => {
    let state = edit(withResources('alpha', 'beta'), 'alpha', 'old', 'new');
    const snap = snapshotChanges(state);
    // Typed while the request was in flight.
    state = edit(state, 'beta', 'old', 'later');
    state = workspaceReducer(state, {
      type: 'saved',
      response: {
        prUrl: 'https://github.com/o/r/pull/5',
        prNumber: 5,
        branchName: 'qs-update-batch-1',
        headSha: 'head-1',
        status: 'created',
        paths: [],
      },
      sent: snap.sent,
    });
    expect(dirtyResources(state).map((r) => r.name)).toEqual(['beta']);
    expect(state.pr).toEqual({
      number: 5,
      url: 'https://github.com/o/r/pull/5',
      branchName: 'qs-update-batch-1',
      headSha: 'head-1',
    });
    expect(
      state.resources.find((r) => r.name === 'alpha')?.content?.saved
    ).toContain('https://new.example.com/alpha');
  });

  it('loads a PR as the whole workspace', () => {
    const state = workspaceReducer(withResources('beta'), {
      type: 'loadPR',
      workspace: {
        number: 9,
        title: 'T',
        htmlUrl: 'https://github.com/o/r/pull/9',
        branchName: 'qs-update-batch-9',
        headSha: 'head-9',
        resources: [snapshot('alpha')],
        missing: ['gone'],
      },
    });
    expect(state.resources.map((r) => r.name)).toEqual(['alpha']);
    expect(state.pr?.headSha).toBe('head-9');
    expect(state.pendingBranchName).toBe('qs-update-batch-9');
    expect(state.missing).toEqual(['gone']);
  });
});

describe('snapshotChanges', () => {
  it('sends only the real file that changed', () => {
    const state = edit(
      withResources('alpha', 'beta'),
      'alpha',
      'old.example',
      'new.example'
    );
    const snap = snapshotChanges(state);
    expect(snap.problems).toEqual([]);
    expect(snap.resources).toEqual([
      {
        name: 'alpha',
        files: [
          {
            name: 'alpha.yaml',
            content: contentFor('alpha').replace('old.example', 'new.example'),
          },
        ],
      },
    ]);
    expect(snap.changes).toEqual([
      expect.objectContaining({
        path: 'docs/quickstarts/alpha/alpha.yaml',
        before: contentFor('alpha'),
        isNew: false,
      }),
    ]);
  });

  it('sends the metadata file for a tag edit', () => {
    const state = edit(
      withResources('alpha'),
      'alpha',
      'value: insights',
      'value: openshift'
    );
    const snap = snapshotChanges(state);
    expect(snap.resources[0].files).toEqual([
      {
        name: 'metadata.yml',
        content: metadataFor('alpha').replace('insights', 'openshift'),
      },
    ]);
  });

  it('sends a new resource complete, marked for creation', () => {
    const buffer = scaffoldResource({
      kind: 'quickstart',
      name: 'fresh',
      title: 'Fresh',
      description: 'New',
      bundles: [],
    });
    const state = workspaceReducer(emptyWorkspace(), {
      type: 'createResource',
      name: 'fresh',
      buffer,
    });
    const [resource] = snapshotChanges(state).resources;
    expect(resource.create).toBe(true);
    expect(resource.files.map((f) => f.name)).toEqual([
      'metadata.yml',
      'fresh.yml',
    ]);
    expect(resource.files[0].content).toBe(
      'kind: QuickStarts\nname: fresh\ntags: []\n'
    );
    expect(resource.files[1].content).not.toContain('tags');
    expect(resource.files[1].content).toContain('  name: fresh\n');
  });

  it('blocks a rename and invalid YAML, naming the resource', () => {
    let state = edit(
      withResources('alpha', 'beta'),
      'alpha',
      'name: alpha',
      'name: renamed'
    );
    state = workspaceReducer(state, {
      type: 'edit',
      name: 'beta',
      buffer: 'metadata: [',
    });
    const snap = snapshotChanges(state);
    expect(snap.resources).toEqual([]);
    expect(snap.problems.map((p) => p.resource)).toEqual(['alpha', 'beta']);
    expect(snap.problems[0].message).toMatch(/must stay "alpha"/);
  });

  it('does not block a save over a quirk in a file it leaves alone', () => {
    const duplicate = `${metadataFor('alpha')}  kind: use-case\n`;
    let state = workspaceReducer(emptyWorkspace(), {
      type: 'addResources',
      resources: [
        snapshot('alpha', [
          { name: 'metadata.yml', content: duplicate },
          { name: 'alpha.yml', content: contentFor('alpha') },
        ]),
      ],
    });
    state = edit(state, 'alpha', 'old.example', 'new.example');
    const snap = snapshotChanges(state);
    expect(snap.problems).toEqual([]);
    expect(snap.resources[0].files.map((f) => f.name)).toEqual(['alpha.yml']);

    // Touching the broken file itself is caught before the server sees it.
    state = edit(state, 'alpha', 'value: insights', 'value: other');
    expect(snapshotChanges(state).problems[0].message).toMatch(
      /metadata\.yml: .*unique/
    );
  });
});

describe('helpers', () => {
  it('previews from the buffer, including tags', () => {
    const state = withResources('alpha');
    const preview = previewForResource(state.resources[0]);
    expect(preview.quickStart?.spec.displayName).toBe('alpha title');
    expect(preview.quickStart?.metadata.tags).toEqual([
      { kind: 'bundle', value: 'insights' },
    ]);
    expect(
      previewForResource({ ...state.resources[0], buffer: 'a: [' }).error
    ).toBeDefined();
  });

  it('titles resources by display name and flags renames', () => {
    const [r] = withResources('alpha').resources;
    expect(resourceTitle(r)).toBe('alpha title');
    expect(resourceTitle({ ...r, buffer: 'a: [' })).toBe('alpha');
    expect(resourceProblem(r)).toBeNull();
  });

  it('marks new directories in the default PR body', () => {
    const state = workspaceReducer(withResources('alpha'), {
      type: 'createResource',
      name: 'fresh',
      buffer: 'metadata:\n  name: fresh\n',
    });
    expect(defaultPRBody(state, ['alpha', 'fresh'])).toContain(
      '- docs/quickstarts/alpha/\n- docs/quickstarts/fresh/ (new)'
    );
  });
});
