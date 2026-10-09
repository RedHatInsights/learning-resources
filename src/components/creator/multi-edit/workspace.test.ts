import {
  WorkspaceState,
  defaultPRBody,
  dirtyResources,
  emptyWorkspace,
  pendingCount,
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

describe('resources whose content file already has the tags', () => {
  // PR #507's shape: metadata.yaml plus a content file with the same tags.
  const meta =
    'kind: QuickStarts\nname: dup\ntags:\n  - kind: bundle\n    value: insights\n';
  const content =
    'metadata:\n  name: dup\n  tags:\n    - kind: bundle\n      value: insights\nspec:\n  displayName: Dup\n  link:\n    href: https://old.example.com\n';
  const files = (c: string) => [
    { name: 'metadata.yaml', content: meta },
    { name: 'dup.yaml', content: c },
  ];

  it('edits them together as the content file itself', () => {
    const r = resourceFromSnapshot(snapshot('dup', files(content)));
    expect(r?.layout).toBe('combined');
    expect(r?.tagsInContent).toBe(true);
    expect(r?.buffer).toBe(content);
  });

  it('saves a URL edit to the content file only and a tag edit to both', () => {
    let state = workspaceReducer(emptyWorkspace(), {
      type: 'addResources',
      resources: [snapshot('dup', files(content))],
    });
    state = edit(state, 'dup', 'old.example', 'new.example');
    expect(snapshotChanges(state).changes.map((c) => c.name)).toEqual([
      'dup.yaml',
    ]);

    state = edit(state, 'dup', 'value: insights', 'value: rhel');
    const { changes } = snapshotChanges(state);
    expect(changes.map((c) => c.name)).toEqual(['metadata.yaml', 'dup.yaml']);
    expect(changes[0].after).toContain('value: rhel');
    expect(changes[1].after).toContain('value: rhel');
    expect(changes[1].after).toContain('new.example');
  });

  it('keeps the metadata file and says why when the tag lists differ', () => {
    const r = resourceFromSnapshot(
      snapshot('dup', files(content.replace('value: insights', 'value: rhel')))
    );
    expect(r?.layout).toBe('content');
    expect(r?.metadataSkipped).toBe('tags-differ');
    expect(r?.metadata?.name).toBe('metadata.yaml');
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
      reverted: [],
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

describe('removing resources from a PR', () => {
  const loaded = () =>
    workspaceReducer(emptyWorkspace(), {
      type: 'loadPR',
      workspace: {
        number: 9,
        title: 'T',
        htmlUrl: 'https://github.com/o/r/pull/9',
        branchName: 'qs-update-batch-9',
        headSha: 'head-9',
        resources: [snapshot('alpha'), snapshot('beta')],
        missing: [],
      },
    });

  it('queues a revert that the next save sends and can be undone', () => {
    let state = workspaceReducer(edit(loaded(), 'alpha', 'old', 'new'), {
      type: 'removeFromPR',
      names: ['alpha'],
    });
    expect(state.resources.map((r) => r.name)).toEqual(['beta']);
    expect(pendingCount(state)).toBe(1);
    expect(snapshotChanges(state).resources).toEqual([
      { name: 'alpha', revert: true, files: [] },
    ]);

    state = workspaceReducer(state, { type: 'undoRemoval', name: 'alpha' });
    expect(state.removals).toEqual([]);
    expect(bufferOf(state, 'alpha')).toContain('new.example');
    expect(state.activeName).toBe('alpha');
  });

  it('only closes resources the PR does not change', () => {
    let state = workspaceReducer(loaded(), {
      type: 'addResources',
      resources: [snapshot('gamma')],
    });
    state = workspaceReducer(state, { type: 'removeFromPR', names: ['gamma'] });
    expect(state.resources.map((r) => r.name)).toEqual(['alpha', 'beta']);
    expect(state.removals).toEqual([]);
  });

  it('drops a pending removal when the resource is added back', () => {
    let state = workspaceReducer(loaded(), {
      type: 'removeFromPR',
      names: ['beta'],
    });
    state = workspaceReducer(state, {
      type: 'addResources',
      resources: [snapshot('beta')],
    });
    expect(state.removals).toEqual([]);
    expect(pendingCount(state)).toBe(0);
  });

  it('moves a renamed resource once saved, and reverts both folders if removed', () => {
    let state = edit(loaded(), 'alpha', 'name: alpha', 'name: omega');
    state = workspaceReducer(state, { type: 'setActive', name: 'alpha' });
    const snap = snapshotChanges(state);
    state = workspaceReducer(state, {
      type: 'saved',
      response: {
        prUrl: 'https://github.com/o/r/pull/9',
        prNumber: 9,
        branchName: 'qs-update-batch-9',
        headSha: 'head-10',
        status: 'updated',
        paths: [],
      },
      sent: snap.sent,
      reverted: [],
    });
    const omega = state.resources.find((r) => r.name === 'omega');
    expect(omega).toEqual(
      expect.objectContaining({
        path: 'docs/quickstarts/omega',
        renamedFrom: 'alpha',
        content: expect.objectContaining({ name: 'omega.yaml' }),
      })
    );
    expect(dirtyResources(state)).toEqual([]);
    expect(state.activeName).toBe('omega');
    expect(state.prResources).toEqual(['omega', 'beta']);

    // Further edits are plain edits under the new folder.
    state = edit(state, 'omega', 'old.example', 'new.example');
    expect(snapshotChanges(state).resources).toEqual([
      expect.objectContaining({ name: 'omega', files: [expect.anything()] }),
    ]);

    // Taking it out of the PR restores the folder it came from as well.
    state = workspaceReducer(state, { type: 'removeFromPR', names: ['omega'] });
    expect(snapshotChanges(state).resources).toEqual([
      { name: 'omega', revert: true, files: [] },
      { name: 'alpha', revert: true, files: [] },
    ]);
  });

  it('remembers a rename from an earlier session when the PR is reloaded', () => {
    let state = workspaceReducer(emptyWorkspace(), {
      type: 'loadPR',
      workspace: {
        number: 9,
        title: 'T',
        htmlUrl: 'https://github.com/o/r/pull/9',
        branchName: 'qs-update-batch-9',
        headSha: 'head-9',
        resources: [{ ...snapshot('omega'), renamedFrom: 'alpha' }],
        missing: [],
      },
    });
    expect(state.resources[0].renamedFrom).toBe('alpha');

    state = workspaceReducer(state, { type: 'removeFromPR', names: ['omega'] });
    expect(snapshotChanges(state).resources).toEqual([
      { name: 'omega', revert: true, files: [] },
      { name: 'alpha', revert: true, files: [] },
    ]);
  });

  it('forgets reverted resources once saved', () => {
    let state = workspaceReducer(loaded(), {
      type: 'removeFromPR',
      names: ['beta'],
    });
    state = workspaceReducer(state, {
      type: 'saved',
      response: {
        prUrl: 'https://github.com/o/r/pull/9',
        prNumber: 9,
        branchName: 'qs-update-batch-9',
        headSha: 'head-10',
        status: 'updated',
        paths: [],
      },
      sent: {},
      reverted: ['beta'],
    });
    expect(state.removals).toEqual([]);
    expect(state.prResources).toEqual(['alpha']);
    expect(state.pr?.headSha).toBe('head-10');
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

  it('blocks an unusable name and invalid YAML, naming the resource', () => {
    let state = edit(
      withResources('alpha', 'beta'),
      'alpha',
      'name: alpha',
      'name: Not A Slug'
    );
    state = workspaceReducer(state, {
      type: 'edit',
      name: 'beta',
      buffer: 'metadata: [',
    });
    const snap = snapshotChanges(state);
    expect(snap.resources).toEqual([]);
    expect(snap.problems.map((p) => p.resource)).toEqual(['alpha', 'beta']);
    expect(snap.problems[0].message).toMatch(/can only use lowercase/);
  });

  it('moves a renamed resource with both files named for the new name', () => {
    const state = edit(
      withResources('alpha'),
      'alpha',
      'name: alpha',
      'name: omega'
    );
    const snap = snapshotChanges(state);
    expect(snap.problems).toEqual([]);
    expect(snap.renamed).toEqual([{ from: 'alpha', to: 'omega' }]);
    expect(snap.resources).toEqual([
      {
        name: 'omega',
        renameFrom: 'alpha',
        files: [
          {
            name: 'metadata.yml',
            content: metadataFor('alpha').replace('name: alpha', 'name: omega'),
          },
          {
            // The content file keeps its extension.
            name: 'omega.yaml',
            content: contentFor('alpha').replace('name: alpha', 'name: omega'),
          },
        ],
      },
    ]);
    expect(snap.changes.map((c) => [c.previousPath, c.path])).toEqual([
      [
        'docs/quickstarts/alpha/metadata.yml',
        'docs/quickstarts/omega/metadata.yml',
      ],
      [
        'docs/quickstarts/alpha/alpha.yaml',
        'docs/quickstarts/omega/omega.yaml',
      ],
    ]);
    expect(defaultPRBody(state, ['alpha'])).toContain(
      '- docs/quickstarts/omega/ (renamed from alpha)'
    );
  });

  it('keeps a mismatched folder unless the name itself changes', () => {
    // A few real resources live in a folder that does not match their name.
    let state = workspaceReducer(emptyWorkspace(), {
      type: 'addResources',
      resources: [
        snapshot('old-folder', [
          { name: 'metadata.yml', content: metadataFor('real-name') },
          { name: 'real-name.yml', content: contentFor('real-name') },
        ]),
      ],
    });
    state = edit(state, 'old-folder', 'old.example', 'new.example');
    let snap = snapshotChanges(state);
    expect(snap.problems).toEqual([]);
    expect(snap.resources).toEqual([
      expect.objectContaining({
        name: 'old-folder',
        files: [expect.anything()],
      }),
    ]);
    expect(snap.resources[0].renameFrom).toBeUndefined();

    // Naming it after its folder needs no move, only the metadata file.
    state = edit(state, 'old-folder', 'name: real-name', 'name: old-folder');
    snap = snapshotChanges(state);
    expect(snap.renamed).toEqual([]);
    expect(snap.resources[0].name).toBe('old-folder');
    expect(snap.resources[0].files.map((f) => f.name)).toEqual([
      'metadata.yml',
      'real-name.yml',
    ]);
    expect(snap.resources[0].files[0].content).toContain('name: old-folder\n');
  });

  it('rejects two resources claiming the same name', () => {
    let state = edit(
      withResources('alpha', 'beta'),
      'alpha',
      'name: alpha',
      'name: beta'
    );
    expect(snapshotChanges(state).problems[0].message).toMatch(
      /already named "beta"/
    );
    state = edit(state, 'alpha', 'name: beta', 'name: gamma');
    state = edit(state, 'beta', 'name: beta', 'name: gamma');
    expect(snapshotChanges(state).problems).toHaveLength(2);
  });

  it('renames a new resource before its first save by creating it under the new name', () => {
    let state = workspaceReducer(emptyWorkspace(), {
      type: 'createResource',
      name: 'fresh',
      buffer: scaffoldResource({
        kind: 'quickstart',
        name: 'fresh',
        title: 'Fresh',
        description: 'd',
        bundles: [],
      }),
    });
    state = edit(state, 'fresh', 'name: fresh', 'name: fresher');
    const [resource] = snapshotChanges(state).resources;
    expect(resource).toEqual(
      expect.objectContaining({ name: 'fresher', create: true })
    );
    expect(resource.renameFrom).toBeUndefined();
    expect(resource.files.map((f) => f.name)).toEqual([
      'metadata.yml',
      'fresher.yml',
    ]);
    expect(resource.files[0].content).toContain('name: fresher\n');
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
