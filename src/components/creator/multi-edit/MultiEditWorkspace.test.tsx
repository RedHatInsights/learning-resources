import React, { useReducer } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import MultiEditWorkspace from './MultiEditWorkspace';
import { emptyWorkspace, workspaceReducer } from './workspace';
import {
  QuickstartsAPIError,
  getCreatorPRResource,
  getCreatorPRWorkspace,
  getRepoQuickstartContent,
  listCreatorPRs,
  listRepoQuickstarts,
  submitBatchPR,
} from '../../../utils/createQuickstartPR';
import { ExtendedQuickstart } from '../../../utils/fetchQuickstarts';

const mockGetUser = jest.fn().mockResolvedValue({
  identity: {
    user: {
      email: 'author@redhat.com',
      first_name: 'Doc',
      last_name: 'Author',
    },
  },
});
jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  useChrome: () => ({
    auth: { getUser: mockGetUser },
    getAvailableBundles: () => [
      { id: 'insights', title: 'RHEL' },
      { id: 'openshift', title: 'OpenShift' },
    ],
  }),
}));

jest.mock('@monaco-editor/react', () => {
  const MockEditor = ({
    value,
    path,
    onChange,
  }: {
    value: string;
    path: string;
    onChange: (value: string | undefined) => void;
  }) => (
    <textarea
      data-testid="mock-monaco-editor"
      aria-label={`Edit ${path}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return { __esModule: true, default: MockEditor };
});

jest.mock('../CreatorPreview', () => ({
  __esModule: true,
  default: ({
    quickStart,
    currentStage,
    onStageChange,
  }: {
    quickStart: ExtendedQuickstart;
    currentStage: { type: string; index?: number };
    onStageChange?: (stage: { type: string; index?: number }) => void;
  }) => (
    <div data-testid="preview">
      {quickStart.spec.displayName} · {currentStage.type}
      {currentStage.index ?? ''}
      {/* Stands in for the panel's own Next button. */}
      <button
        onClick={() =>
          onStageChange?.({
            type: 'task',
            index:
              currentStage.type === 'task' ? (currentStage.index ?? 0) + 1 : 0,
          })
        }
      >
        Panel next
      </button>
    </div>
  ),
}));

jest.mock('../../../utils/createQuickstartPR', () => {
  const actual = jest.requireActual('../../../utils/createQuickstartPR');
  return {
    ...actual,
    listRepoQuickstarts: jest.fn(),
    getRepoQuickstartContent: jest.fn(),
    listCreatorPRs: jest.fn(),
    getCreatorPRWorkspace: jest.fn(),
    getCreatorPRResource: jest.fn(),
    submitBatchPR: jest.fn(),
  };
});

const mocked = {
  listRepo: listRepoQuickstarts as jest.Mock,
  getRepo: getRepoQuickstartContent as jest.Mock,
  listPRs: listCreatorPRs as jest.Mock,
  getWorkspace: getCreatorPRWorkspace as jest.Mock,
  getResource: getCreatorPRResource as jest.Mock,
  submit: submitBatchPR as jest.Mock,
};

const metadataFor = (name: string) =>
  `kind: QuickStarts\nname: ${name}\ntags:\n- kind: bundle\n  value: insights\n`;
const contentFor = (name: string) =>
  `# comment kept\nmetadata:\n  name: ${name}\nspec:\n  displayName: ${name} title\n  link:\n    href: https://old.example.com/${name}\n`;
/** What the editor shows: the content file with the tags merged in. */
const combinedFor = (name: string) =>
  contentFor(name).replace(
    `  name: ${name}\n`,
    `  name: ${name}\n  tags:\n  - kind: bundle\n    value: insights\n`
  );

const repoContent = (name: string) => ({
  name,
  headSha: 'base-sha',
  files: [
    { name: 'metadata.yml', content: metadataFor(name) },
    { name: `${name}.yml`, content: contentFor(name) },
  ],
});

const savedResponse = (headSha: string, status = 'created') => ({
  prUrl: 'https://github.com/o/r/pull/77',
  prNumber: 77,
  branchName: 'qs-update-batch-1',
  headSha,
  status,
  paths: [],
});

/** The Creator page owns the workspace; mirror that here. */
const Harness = () => {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    undefined,
    emptyWorkspace
  );
  return (
    <MultiEditWorkspace filterMap={{}} state={state} dispatch={dispatch} />
  );
};
const renderWorkspace = () => render(<Harness />);

const editor = () => screen.getByTestId('mock-monaco-editor');
const typeInto = (value: string) =>
  fireEvent.change(editor(), { target: { value } });
const sidebar = () => screen.getByRole('navigation', { name: 'Resources' });
const selectResource = (title: string) =>
  fireEvent.click(
    within(sidebar()).getByRole('button', { name: new RegExp(`^${title}`) })
  );

const openPicker = async () => {
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Choose resources' })[0]
  );
  return screen.findByRole('dialog', { name: 'Choose resources' });
};
const toggleRow = async (dialog: HTMLElement, name: string) => {
  const row = (
    await within(dialog).findByText(`docs/quickstarts/${name}`)
  ).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('checkbox'));
};
const chooseResources = async (...names: string[]) => {
  const dialog = await openPicker();
  for (const name of names) await toggleRow(dialog, name);
  fireEvent.click(within(dialog).getByRole('button', { name: /^Add \d+/ }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Choose resources' })
    ).not.toBeInTheDocument()
  );
};
const openReview = async () => {
  fireEvent.click(
    screen.getByRole('button', { name: /^(Create PR|Save to PR)/ })
  );
  return screen.findByRole('dialog', {
    name: /^(Create pull request|Save to PR)/,
  });
};

describe('MultiEditWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.submit.mockReset();
    window.localStorage.clear();
    window.localStorage.setItem('lr-creator-multi-edit-view', 'split');
    mocked.listRepo.mockResolvedValue([
      { name: 'alpha', displayName: 'Alpha' },
      { name: 'beta', displayName: 'Beta' },
      { name: 'gamma', displayName: 'Gamma' },
    ]);
    mocked.getRepo.mockImplementation(async (name: string) =>
      repoContent(name)
    );
    mocked.listPRs.mockResolvedValue([]);
  });

  it('starts empty with every way in', () => {
    renderWorkspace();
    expect(
      screen.getByText('Edit several learning resources in one pull request')
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'New resource' })
    ).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Create PR/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('opens each resource as one combined document with a preview', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');

    expect(
      screen.getByRole('heading', { name: '2 resources' })
    ).toBeInTheDocument();
    expect(editor()).toHaveValue(combinedFor('alpha'));
    expect(screen.getByTestId('preview')).toHaveTextContent(
      'alpha title · card'
    );
    expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(2);
  });

  it('saves edits across resources to one PR, splitting files back, then appends', async () => {
    mocked.submit
      .mockResolvedValueOnce(savedResponse('head-1'))
      .mockResolvedValueOnce(savedResponse('head-2', 'updated'));
    renderWorkspace();
    await chooseResources('alpha', 'beta');

    // A URL edit in alpha, a tag edit in beta.
    typeInto(combinedFor('alpha').replace('old.example', 'new.example'));
    selectResource('beta title');
    typeInto(
      combinedFor('beta').replace('value: insights', 'value: openshift')
    );
    selectResource('alpha title');
    expect(editor()).toHaveValue(
      combinedFor('alpha').replace('old.example', 'new.example')
    );
    expect(screen.getByText(/2 unsaved/)).toBeInTheDocument();

    let dialog = await openReview();
    expect(
      within(dialog).getByText(/2 files in 2 resources/)
    ).toBeInTheDocument();
    // The diff shows the real file, not the combined buffer, as one
    // numbered row per line with the change marked.
    const diff = within(dialog).getByRole('table', { name: 'Line changes' });
    expect(
      within(diff).getByText('Removed').closest('[role="row"]')
    ).toHaveTextContent('7-Removed href: https://old.example.com/alpha');
    expect(
      within(diff).getByText('Added').closest('[role="row"]')
    ).toHaveTextContent('7+Added href: https://new.example.com/alpha');
    const create = within(dialog).getByRole('button', {
      name: 'Create pull request',
    });
    expect(create).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Pull request title/), {
      target: { value: 'Update docs URLs' },
    });
    fireEvent.click(create);

    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(1));
    const [createMeta, createResources] = mocked.submit.mock.calls[0];
    expect(createMeta).toEqual(
      expect.objectContaining({
        branchName: expect.stringMatching(/^qs-update-batch-/),
        baseSha: 'base-sha',
        prTitle: 'Update docs URLs',
        userEmail: 'author@redhat.com',
      })
    );
    expect(createMeta.prNumber).toBeUndefined();
    expect(createMeta.commitMessage).toContain(
      'Co-authored-by: Doc Author <author@redhat.com>'
    );
    expect(createResources).toEqual([
      {
        name: 'alpha',
        files: [
          {
            name: 'alpha.yml',
            content: contentFor('alpha').replace('old.example', 'new.example'),
          },
        ],
      },
      {
        name: 'beta',
        files: [
          {
            name: 'metadata.yml',
            content: metadataFor('beta').replace('insights', 'openshift'),
          },
        ],
      },
    ]);

    expect(
      await screen.findByRole('link', { name: 'PR #77' })
    ).toBeInTheDocument();
    expect(screen.getByText(/All changes saved at/)).toBeInTheDocument();

    // The next save appends to the same PR, against the returned head.
    typeInto(combinedFor('alpha').replace('old.example', 'newer.example'));
    dialog = await openReview();
    expect(
      within(dialog).queryByLabelText(/Pull request title/)
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save to PR #77' })
    );

    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(2));
    const [updateMeta] = mocked.submit.mock.calls[1];
    expect(updateMeta).toEqual(
      expect.objectContaining({ prNumber: 77, expectedHeadSha: 'head-1' })
    );
    expect(updateMeta.branchName).toBeUndefined();
  });

  it('removes a resource by unchecking it in the picker', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta', 'gamma');

    const dialog = await openPicker();
    await toggleRow(dialog, 'beta');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Remove 1 resource' })
    );

    await waitFor(() =>
      expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(2)
    );
    expect(within(sidebar()).queryByText('beta title')).not.toBeInTheDocument();
  });

  it('confirms before removing a resource with unsaved edits', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');
    typeInto(combinedFor('alpha').replace('old', 'new'));

    fireEvent.click(screen.getByRole('button', { name: 'Remove alpha title' }));
    let confirm = await screen.findByRole('dialog', {
      name: /Remove resource\?/,
    });
    expect(within(confirm).getByText(/will be lost/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(2);

    // Unchecking it in the picker goes through the same confirmation.
    const picker = await openPicker();
    expect(
      await within(picker).findByText(/unsaved edits/)
    ).toBeInTheDocument();
    await toggleRow(picker, 'alpha');
    fireEvent.click(
      within(picker).getByRole('button', { name: 'Remove 1 resource' })
    );
    confirm = await screen.findByRole('dialog', { name: /Remove resource\?/ });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(1)
    );
    expect(editor()).toHaveValue(combinedFor('beta'));
  });

  it('removes a clean resource without asking', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');
    fireEvent.click(screen.getByRole('button', { name: 'Remove beta title' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('creates a new resource alongside edits in the same PR', async () => {
    mocked.submit.mockResolvedValueOnce(savedResponse('head-1'));
    renderWorkspace();
    await chooseResources('alpha');
    typeInto(combinedFor('alpha').replace('old.example', 'new.example'));

    fireEvent.click(screen.getByRole('button', { name: 'New resource' }));
    const dialog = await screen.findByRole('dialog', { name: 'New resource' });
    fireEvent.change(within(dialog).getByLabelText(/Title/), {
      target: { value: 'Inventory API guide' },
    });
    expect(within(dialog).getByLabelText(/Directory name/)).toHaveValue(
      'inventory-api-guide'
    );
    const createButton = within(dialog).getByRole('button', {
      name: 'Create resource',
    });
    expect(createButton).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Link URL/), {
      target: { value: 'https://docs.example.com/api' },
    });
    fireEvent.click(within(dialog).getByLabelText('RHEL'));
    fireEvent.click(createButton);

    expect(
      await within(sidebar()).findByText('Inventory API guide')
    ).toBeInTheDocument();
    expect(within(sidebar()).getByText('New')).toBeInTheDocument();
    expect((editor() as HTMLTextAreaElement).value).toContain(
      'name: inventory-api-guide'
    );

    const review = await openReview();
    expect(
      within(review).getByText(/3 files in 2 resources \(1 new\)/)
    ).toBeInTheDocument();
    fireEvent.change(within(review).getByLabelText(/Pull request title/), {
      target: { value: 'Inventory docs' },
    });
    fireEvent.click(
      within(review).getByRole('button', { name: 'Create pull request' })
    );

    await waitFor(() => expect(mocked.submit).toHaveBeenCalled());
    const [, resources] = mocked.submit.mock.calls[0];
    expect(resources.map((r: { name: string }) => r.name)).toEqual([
      'alpha',
      'inventory-api-guide',
    ]);
    const created = resources[1];
    expect(created.create).toBe(true);
    expect(created.files[0]).toEqual({
      name: 'metadata.yml',
      content:
        'kind: QuickStarts\nname: inventory-api-guide\ntags:\n  - kind: bundle\n    value: insights\n',
    });
    expect(created.files[1].name).toBe('inventory-api-guide.yml');
    expect(created.files[1].content).toContain(
      'href: https://docs.example.com/api'
    );

    // Once saved it is an ordinary resource.
    await waitFor(() =>
      expect(within(sidebar()).queryByText('New')).not.toBeInTheDocument()
    );
  });

  it('rejects a new resource name that is taken', async () => {
    renderWorkspace();
    await chooseResources('alpha');
    fireEvent.click(screen.getByRole('button', { name: 'New resource' }));
    const dialog = await screen.findByRole('dialog', { name: 'New resource' });
    fireEvent.change(within(dialog).getByLabelText(/Directory name/), {
      target: { value: 'alpha' },
    });
    expect(
      within(dialog).getByText(
        'A resource with this name is already in the workspace.'
      )
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Directory name/), {
      target: { value: 'gamma' },
    });
    expect(
      await within(dialog).findByText(
        'A resource with this name already exists in the repository.'
      )
    ).toBeInTheDocument();
  });

  it('blocks saving invalid YAML or an unusable name and says where', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');
    typeInto('spec: [unclosed');
    expect(screen.getByText(/^YAML problem:/)).toBeInTheDocument();
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
    selectResource('beta title');
    typeInto(combinedFor('beta').replace('name: beta', 'name: Beta Two'));

    const dialog = await openReview();
    expect(
      within(dialog).getByText('Fix these problems before saving')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/"Beta Two" can only use lowercase letters/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Create pull request' })
    ).toBeDisabled();
    expect(mocked.submit).not.toHaveBeenCalled();
  });

  it('renames a resource by its metadata.name, moving its folder', async () => {
    mocked.submit.mockResolvedValueOnce(savedResponse('head-1'));
    renderWorkspace();
    await chooseResources('alpha', 'beta');

    // A display name change is an ordinary edit; a metadata.name change moves
    // the folder. Each happens on its own resource without touching the other.
    typeInto(combinedFor('alpha').replace('name: alpha', 'name: alpha-two'));
    expect(
      within(sidebar()).getByText('alpha → alpha-two')
    ).toBeInTheDocument();
    expect(
      screen.getByText('docs/quickstarts/alpha/ → alpha-two/')
    ).toBeInTheDocument();
    selectResource('beta title');
    typeInto(combinedFor('beta').replace('beta title', 'Beta, retitled'));

    const dialog = await openReview();
    expect(
      within(dialog).queryByText('Fix these problems before saving')
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText('Renamed')).toBeInTheDocument();
    expect(within(dialog).getByText('alpha → alpha-two')).toBeInTheDocument();
    expect(
      within(dialog).getByText('moved from docs/quickstarts/alpha/metadata.yml')
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Commit message/)).toHaveValue(
      'docs(quickstarts): update 1 learning resource, rename alpha to alpha-two'
    );
    fireEvent.change(within(dialog).getByLabelText(/Pull request title/), {
      target: { value: 'Rename alpha' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create pull request' })
    );

    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(1));
    const [, resources] = mocked.submit.mock.calls[0];
    expect(resources).toEqual([
      {
        name: 'alpha-two',
        renameFrom: 'alpha',
        files: [
          {
            name: 'metadata.yml',
            content: metadataFor('alpha').replace(
              'name: alpha',
              'name: alpha-two'
            ),
          },
          {
            name: 'alpha-two.yml',
            content: contentFor('alpha').replace(
              'name: alpha',
              'name: alpha-two'
            ),
          },
        ],
      },
      {
        name: 'beta',
        files: [
          {
            name: 'beta.yml',
            content: contentFor('beta').replace('beta title', 'Beta, retitled'),
          },
        ],
      },
    ]);

    // Afterwards the resource lives under its new folder and is clean.
    expect(await screen.findByText(/All changes saved at/)).toBeInTheDocument();
    selectResource('alpha title');
    expect(screen.getByText('docs/quickstarts/alpha-two/')).toBeInTheDocument();
    expect(within(sidebar()).getByText('alpha-two')).toBeInTheDocument();
  });

  it('keeps edits and explains a conflict', async () => {
    mocked.submit.mockRejectedValueOnce(
      new QuickstartsAPIError(
        'pull request #77 has new commits; reload it before saving',
        409
      )
    );
    renderWorkspace();
    await chooseResources('alpha');
    const edited = combinedFor('alpha').replace('old', 'new');
    typeInto(edited);

    const dialog = await openReview();
    fireEvent.change(within(dialog).getByLabelText(/Pull request title/), {
      target: { value: 'Update' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create pull request' })
    );

    expect(
      await within(dialog).findByText(
        'The pull request changed since it was loaded'
      )
    ).toBeInTheDocument();
    expect(editor()).toHaveValue(edited);
  });

  it('previews quick start overview and tasks', async () => {
    mocked.getRepo.mockImplementation(async (name: string) => ({
      ...repoContent(name),
      files: [
        { name: 'metadata.yml', content: metadataFor(name) },
        {
          name: `${name}.yml`,
          content: `metadata:\n  name: ${name}\nspec:\n  displayName: QS\n  type:\n    text: Quick start\n  tasks:\n    - title: Open it\n    - title: Use it\n`,
        },
      ],
    }));
    renderWorkspace();
    await chooseResources('alpha');

    const select = screen.getByRole('combobox', { name: 'Preview view' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual([
      'Catalog card',
      'Quick start overview',
      'Task 1: Open it',
      'Task 2: Use it',
      'Summary',
    ]);
    fireEvent.change(select, { target: { value: 'task-1' } });
    expect(screen.getByTestId('preview')).toHaveTextContent('QS · task1');

    // Moving through the panel moves the picker too, up to the summary.
    fireEvent.click(screen.getByRole('button', { name: 'Panel next' }));
    expect(select).toHaveValue('summary');
    expect(screen.getByTestId('preview')).toHaveTextContent('QS · task2');
    fireEvent.change(select, { target: { value: 'task-0' } });

    // Preview-only view keeps the editor mounted for its undo history.
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(editor()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editor' }));
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument();

    // Coming back reopens the preview where it was left.
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    expect(screen.getByTestId('preview')).toHaveTextContent('QS · task0');
  });

  it('resumes a PR and reads added resources from its head', async () => {
    mocked.listPRs.mockResolvedValue([
      {
        number: 88,
        title: 'Update Inventory docs',
        htmlUrl: 'https://github.com/o/r/pull/88',
        branchName: 'qs-update-batch-9',
        slug: '',
      },
    ]);
    const atHead = (name: string) => ({
      name,
      path: `docs/quickstarts/${name}`,
      files: repoContent(name).files.map((f) => ({
        ...f,
        path: `docs/quickstarts/${name}/${f.name}`,
      })),
    });
    mocked.getWorkspace.mockResolvedValue({
      number: 88,
      title: 'Update Inventory docs',
      htmlUrl: 'https://github.com/o/r/pull/88',
      branchName: 'qs-update-batch-9',
      headSha: 'head-88',
      missing: [],
      resources: [atHead('alpha')],
    });
    mocked.getResource.mockResolvedValue({
      headSha: 'head-88',
      resource: atHead('gamma'),
    });

    renderWorkspace();
    fireEvent.click(
      screen.getAllByRole('button', { name: /Continue (an )?open PR/ })[0]
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Continue open PR',
    });
    fireEvent.click(
      await within(dialog).findByRole('button', { name: 'Open PR #88' })
    );

    expect(
      await screen.findByRole('link', { name: 'PR #88' })
    ).toBeInTheDocument();
    expect(screen.getByText(/No unsaved changes/)).toBeInTheDocument();

    await chooseResources('gamma');
    expect(mocked.getResource).toHaveBeenCalledWith(88, 'gamma', 'head-88');
    expect(mocked.getRepo).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: '2 resources' })
    ).toBeInTheDocument();
  });

  it('removes a resource from the PR on the next save', async () => {
    const atHead = (name: string) => ({
      name,
      path: `docs/quickstarts/${name}`,
      files: repoContent(name).files.map((f) => ({
        ...f,
        path: `docs/quickstarts/${name}/${f.name}`,
      })),
    });
    mocked.listPRs.mockResolvedValue([
      {
        number: 88,
        title: 'Update Inventory docs',
        htmlUrl: 'https://github.com/o/r/pull/88',
        branchName: 'qs-update-batch-9',
        slug: '',
      },
    ]);
    mocked.getWorkspace.mockResolvedValue({
      number: 88,
      title: 'Update Inventory docs',
      htmlUrl: 'https://github.com/o/r/pull/88',
      branchName: 'qs-update-batch-9',
      headSha: 'head-88',
      missing: [],
      resources: [atHead('alpha'), atHead('beta')],
    });
    mocked.submit.mockResolvedValue(savedResponse('head-89', 'updated'));

    renderWorkspace();
    fireEvent.click(
      screen.getAllByRole('button', { name: /Continue (an )?open PR/ })[0]
    );
    const prDialog = await screen.findByRole('dialog', {
      name: 'Continue open PR',
    });
    fireEvent.click(
      await within(prDialog).findByRole('button', { name: 'Open PR #88' })
    );
    await screen.findByRole('link', { name: 'PR #88' });

    fireEvent.click(
      within(sidebar()).getByRole('button', { name: 'Remove beta title' })
    );
    const confirm = await screen.findByRole('dialog', {
      name: /Remove resource\?/,
    });
    expect(confirm).toHaveTextContent('part of PR #88');
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Remove from PR' })
    );

    expect(within(sidebar()).getByText('beta title')).toBeInTheDocument();
    expect(screen.getByText(/1 unsaved/)).toBeInTheDocument();

    const review = await openReview();
    expect(review).toHaveTextContent('1 resource removed from the PR');
    expect(within(review).getByLabelText(/Commit message/)).toHaveValue(
      'docs(quickstarts): remove beta from this PR'
    );
    fireEvent.click(
      within(review).getByRole('button', { name: 'Save to PR #88' })
    );

    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(1));
    const [meta, resources] = mocked.submit.mock.calls[0];
    expect(meta).toEqual(
      expect.objectContaining({ prNumber: 88, expectedHeadSha: 'head-88' })
    );
    expect(resources).toEqual([{ name: 'beta', revert: true, files: [] }]);
    await waitFor(() =>
      expect(screen.getByText(/All changes saved at/)).toBeInTheDocument()
    );
    expect(within(sidebar()).queryByText('beta title')).not.toBeInTheDocument();
  });
});
