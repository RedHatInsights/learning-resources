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
import { FilterData } from '../../../utils/FiltersCategoryInterface';

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

const filterData = {
  categories: [
    {
      categoryId: 'use-case',
      categoryName: 'Use case',
      categoryData: [
        {
          group: '',
          data: [
            { id: 'automation', filterLabel: 'Automation', cardLabel: '' },
          ],
        },
      ],
    },
  ],
} as unknown as FilterData;

/** The Creator page owns the workspace; mirror that here. */
const Harness = () => {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    undefined,
    emptyWorkspace
  );
  return (
    <MultiEditWorkspace
      filterMap={{}}
      filterData={filterData}
      state={state}
      dispatch={dispatch}
    />
  );
};
const renderWorkspace = () => render(<Harness />);

const editor = () => screen.getByTestId('mock-monaco-editor');
const typeInto = (value: string) =>
  fireEvent.change(editor(), { target: { value } });
const sidebar = () => screen.getByRole('navigation', { name: 'Resources' });
/** A sidebar row, found by the title it shows. */
const sidebarRow = (title: string) =>
  within(sidebar())
    .getAllByRole('listitem')
    .find(
      (li) =>
        li.querySelector('.lr-c-multi-edit__resource-title')?.textContent ===
        title
    ) as HTMLElement;
/** Each sidebar row's title and status, top to bottom. */
const sidebarOrder = () =>
  within(sidebar())
    .getAllByRole('listitem')
    .map((li) =>
      [
        li.querySelector('.lr-c-multi-edit__resource-title')?.textContent,
        li.querySelector('.pf-v6-c-label')?.textContent,
      ]
        .filter(Boolean)
        .join(' · ')
    );
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
/** A picker row, found by the resource ID it shows under its title. */
const findRow = async (dialog: HTMLElement, name: string) =>
  (
    await within(dialog).findByText(
      (_text, el) =>
        !!el?.classList.contains('lr-c-multi-edit-picker__id') &&
        el.textContent === `docs/quickstarts/${name}`
    )
  ).closest('tr') as HTMLElement;
const toggleRow = async (dialog: HTMLElement, name: string) => {
  const row = await findRow(dialog, name);
  fireEvent.click(within(row).getByRole('checkbox'));
};
const updateWorkspace = (dialog: HTMLElement) =>
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Update workspace' })
  );
const chooseResources = async (...names: string[]) => {
  const dialog = await openPicker();
  for (const name of names) await toggleRow(dialog, name);
  expect(dialog).toHaveTextContent(`${names.length} to add`);
  updateWorkspace(dialog);
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
  beforeAll(() => {
    // The wizard scrolls each step to the top; jsdom has no layout.
    Element.prototype.scrollTo = jest.fn();
  });

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
    expect(screen.getByText(/2 edited/)).toBeInTheDocument();

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
    expect(dialog).toHaveTextContent('1 to close');
    updateWorkspace(dialog);

    await waitFor(() =>
      expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(2)
    );
    expect(within(sidebar()).queryByText('beta title')).not.toBeInTheDocument();
  });

  it('confirms before removing a resource with unsaved edits', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');
    typeInto(combinedFor('alpha').replace('old', 'new'));

    fireEvent.click(screen.getByRole('button', { name: 'Close alpha title' }));
    let confirm = await screen.findByRole('dialog', {
      name: /Close resource\?/,
    });
    expect(within(confirm).getByText(/will be lost/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(2);

    // Unchecking it in the picker goes through the same confirmation.
    const picker = await openPicker();
    expect(await findRow(picker, 'alpha')).toHaveTextContent('Unsaved');
    await toggleRow(picker, 'alpha');
    updateWorkspace(picker);
    confirm = await screen.findByRole('dialog', { name: /Close resource\?/ });
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Close resource' })
    );

    await waitFor(() =>
      expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(1)
    );
    expect(editor()).toHaveValue(combinedFor('beta'));
  });

  it('removes a clean resource without asking', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');
    fireEvent.click(screen.getByRole('button', { name: 'Close beta title' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(sidebar()).getAllByRole('listitem')).toHaveLength(1);
  });

  /** Opens New resource and moves past its content type step. */
  const startNewResource = async (kind: string) => {
    fireEvent.click(screen.getAllByRole('button', { name: 'New resource' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'New resource' });
    const next = within(dialog).getByRole('button', { name: 'Next' });
    // A type has to be chosen before moving on.
    expect(next).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText(kind));
    fireEvent.click(next);
    await within(dialog).findByLabelText(/Resource title/);
    return dialog;
  };
  const typeField = (dialog: HTMLElement, label: RegExp, value: string) => {
    const field = within(dialog).getByLabelText(label);
    fireEvent.change(field, { target: { value } });
    fireEvent.blur(field);
  };

  it('creates a new resource with the single-resource wizard steps', async () => {
    mocked.submit.mockResolvedValueOnce(savedResponse('head-1'));
    renderWorkspace();
    await chooseResources('alpha');
    typeInto(combinedFor('alpha').replace('old.example', 'new.example'));

    const dialog = await startNewResource('Documentation');
    // The same details as the single-resource wizard, on one step.
    expect(
      within(dialog).getByText(
        'Share the details required to populate a card in the correct places.'
      )
    ).toBeInTheDocument();
    for (const label of [
      /Associated bundle/,
      /Resource tags/,
      /Resource title/,
      /Resource ID/,
      /Resource description/,
      /Endpoint URL/,
    ]) {
      expect(within(dialog).getAllByText(label).length).toBeGreaterThan(0);
    }
    const add = within(dialog).getByRole('button', {
      name: 'Add to workspace',
    });
    expect(add).toBeDisabled();

    typeField(dialog, /Resource title/, 'Inventory API guide');
    typeField(dialog, /Resource description/, 'How to call the Inventory API.');
    typeField(dialog, /Endpoint URL/, 'https://docs.example.com/api');
    fireEvent.click(within(dialog).getByText('Select all that apply'));
    fireEvent.click(await within(dialog).findByText('RHEL (insights)'));
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Select tags' })
    );
    fireEvent.click(await screen.findByText('Automation'));

    await waitFor(() => expect(add).toBeEnabled());
    fireEvent.click(add);

    expect(
      await within(sidebar()).findByText('Inventory API guide')
    ).toBeInTheDocument();
    expect(within(sidebar()).getByText('New')).toBeInTheDocument();
    const yaml = (editor() as HTMLTextAreaElement).value;
    expect(yaml).toContain('name: inventory-api-guide');
    expect(yaml).toContain('kind: use-case');
    expect(yaml).toContain('value: automation');

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
        'kind: QuickStarts\nname: inventory-api-guide\ntags:\n  - kind: bundle\n    value: insights\n  - kind: use-case\n    value: automation\n',
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

  it('keeps answers when going back and asks only what a type needs', async () => {
    renderWorkspace();
    const dialog = await startNewResource('Documentation');
    typeField(dialog, /Resource title/, 'Getting started');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
    fireEvent.click(within(dialog).getByLabelText('Quick start'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));

    // A quick start has a duration instead of a URL, and a starter panel.
    await within(dialog).findByText('Duration');
    expect(within(dialog).queryByLabelText(/Endpoint URL/)).toBeNull();
    expect(within(dialog).getByLabelText(/Resource title/)).toHaveValue(
      'Getting started'
    );
    expect(dialog).toHaveTextContent('A starter panel and task are added');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'New resource' })
      ).not.toBeInTheDocument()
    );
  });

  it('rejects a new resource ID that is taken', async () => {
    renderWorkspace();
    await chooseResources('alpha');
    const dialog = await startNewResource('Quick start');
    // A title that generates a taken ID is caught on the title.
    typeField(dialog, /Resource title/, 'Alpha');
    expect(
      await within(dialog).findByText(
        'A resource with this ID is already in the workspace. Change the title or set an ID below.'
      )
    ).toBeInTheDocument();
    typeField(dialog, /Resource ID/, 'gamma');
    expect(
      await within(dialog).findByText(
        'A resource with this ID already exists in the repository.'
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Add to workspace' })
    ).toBeDisabled();
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
      missing: ['delta'],
      deleted: [],
      resources: [{ ...atHead('alpha'), renamedFrom: 'alpha-old' }],
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
    // A rename made by an earlier save is shown on the resource; only a
    // folder that is neither renamed nor a deleted resource is called out.
    expect(screen.getByText('from alpha-old')).toBeInTheDocument();
    expect(
      screen.getByText('This PR changes a folder that cannot be loaded')
    ).toBeInTheDocument();

    await chooseResources('gamma');
    expect(mocked.getResource).toHaveBeenCalledWith(88, 'gamma', 'head-88');
    expect(mocked.getRepo).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: '2 resources' })
    ).toBeInTheDocument();
  });

  it('confirms before opening a PR discards unsaved work', async () => {
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
      deleted: [],
      resources: [],
    });
    renderWorkspace();
    await chooseResources('alpha');
    typeInto(`${combinedFor('alpha')}# edited\n`);

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
      within(dialog).getByText('Discard 1 unsaved change and open PR #88?')
    ).toBeInTheDocument();
    expect(mocked.getWorkspace).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Keep my changes' })
    );
    expect(mocked.getWorkspace).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText(
        'Opening a PR discards 1 unsaved change in this workspace.'
      )
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Open PR #88' })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Discard and open' })
    );
    expect(
      await screen.findByRole('link', { name: 'PR #88' })
    ).toBeInTheDocument();
    expect(mocked.getWorkspace).toHaveBeenCalledWith(88);
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
      deleted: [],
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
      within(sidebar()).getByRole('button', { name: 'Close beta title' })
    );
    const confirm = await screen.findByRole('dialog', {
      name: /Close resource\?/,
    });
    expect(confirm).toHaveTextContent('changed by PR #88');
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Remove changes from PR' })
    );

    expect(within(sidebar()).getByText('beta title')).toBeInTheDocument();
    expect(screen.getByText(/1 removed from PR/)).toBeInTheDocument();

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

  const openPR = async (workspace: Record<string, unknown>) => {
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
      deleted: [],
      resources: [],
      ...workspace,
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: /Continue (an )?open PR/ })[0]
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Continue open PR',
    });
    fireEvent.click(
      await within(dialog).findByRole('button', { name: 'Open PR #88' })
    );
    await screen.findByRole('link', { name: 'PR #88' });
  };
  const atHead = (name: string) => ({
    name,
    path: `docs/quickstarts/${name}`,
    files: repoContent(name).files.map((f) => ({
      ...f,
      path: `docs/quickstarts/${name}/${f.name}`,
    })),
  });

  it('deletes an untouched resource from the picker in a new PR', async () => {
    mocked.submit.mockResolvedValueOnce(savedResponse('head-1'));
    renderWorkspace();
    await chooseResources('alpha');

    // Deleting is a row action; it never comes from unchecking a row.
    let picker = await openPicker();
    fireEvent.click(
      within(await findRow(picker, 'beta')).getByRole('button', {
        name: 'Actions for Beta',
      })
    );
    // Staged at once, with no confirmation: Undo and the review are the
    // checks.
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete resource' })
    );
    await waitFor(async () =>
      expect(await findRow(picker, 'beta')).toHaveTextContent('To delete')
    );
    expect(mocked.getRepo).toHaveBeenCalledWith('beta');
    const betaRow = await findRow(picker, 'beta');
    expect(within(betaRow).getByRole('checkbox')).toBeDisabled();
    fireEvent.click(within(picker).getByRole('button', { name: 'Cancel' }));

    expect(sidebarOrder()).toEqual(['alpha title', 'beta title · To delete']);
    expect(screen.getByText(/1 to delete/)).toBeInTheDocument();

    const review = await openReview();
    expect(review).toHaveTextContent('1 resource deleted');
    expect(review).toHaveTextContent('deleted when the PR merges');
    expect(within(review).getByLabelText(/Commit message/)).toHaveValue(
      'docs(quickstarts): delete beta'
    );
    fireEvent.change(within(review).getByLabelText(/Pull request title/), {
      target: { value: 'Delete beta' },
    });
    fireEvent.click(
      within(review).getByRole('button', { name: 'Create pull request' })
    );

    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(1));
    const [meta, resources] = mocked.submit.mock.calls[0];
    expect(meta).toEqual(expect.objectContaining({ baseSha: 'base-sha' }));
    expect(resources).toEqual([{ name: 'beta', delete: true, files: [] }]);

    // Once saved it is a deletion the PR makes, which can be restored.
    await waitFor(() =>
      expect(sidebarRow('beta title')).toHaveTextContent('Deleted in PR')
    );
    picker = await openPicker();
    expect(await findRow(picker, 'beta')).toHaveTextContent('Deleted in PR');
  });

  it('keeps the picker selection right when an open resource is deleted and undone', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');

    const picker = await openPicker();
    fireEvent.click(
      within(await findRow(picker, 'alpha')).getByRole('button', {
        name: 'Actions for Alpha',
      })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete resource' })
    );
    const alphaRow = await findRow(picker, 'alpha');
    expect(alphaRow).toHaveTextContent('To delete');
    // Deleting is not a change to what is open: nothing to add back.
    expect(picker).not.toHaveTextContent('to add');
    expect(
      within(picker).getByRole('button', { name: 'Update workspace' })
    ).toBeDisabled();

    fireEvent.click(
      within(alphaRow).getByRole('button', { name: 'Actions for Alpha' })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Undo delete' })
    );
    // Undo brings it back open, so it is not marked to close.
    expect(
      within(await findRow(picker, 'alpha')).getByRole('checkbox')
    ).toBeChecked();
    expect(picker).not.toHaveTextContent('to close');
    expect(
      within(picker).getByRole('button', { name: 'Update workspace' })
    ).toBeDisabled();
  });

  it('brings back unsaved edits when a deletion is undone', async () => {
    renderWorkspace();
    await chooseResources('alpha', 'beta');
    const edited = combinedFor('alpha').replace('old', 'new');
    typeInto(edited);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for alpha title' })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete resource' })
    );
    expect(mocked.getRepo).toHaveBeenCalledTimes(2);
    expect(
      within(sidebar()).queryByRole('button', { name: /^alpha title/ })
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Keep alpha title' }));
    expect(within(sidebar()).getByText('alpha title')).toBeInTheDocument();
    expect(editor()).toHaveValue(edited);
  });

  it('offers undoing the addition rather than deleting a resource the PR added', async () => {
    renderWorkspace();
    await openPR({ resources: [atHead('alpha'), atHead('fresh')] });
    selectResource('fresh title');
    // The catalog loads once there are resources; fresh is not on main.
    await waitFor(() => expect(mocked.listRepo).toHaveBeenCalled());
    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for fresh title' })
    );
    expect(
      await screen.findByRole('menuitem', {
        name: 'Remove from PR (undo addition)…',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Delete resource' })
    ).not.toBeInTheDocument();
  });

  it('reopens a PR that only deletes and restores a resource', async () => {
    mocked.submit.mockResolvedValue(savedResponse('head-89', 'updated'));
    renderWorkspace();
    await openPR({ deleted: [atHead('gamma')] });

    const deleted = sidebarRow('gamma title');
    expect(deleted).toHaveTextContent('Deleted in PR');
    expect(screen.getByText(/No unsaved changes/)).toBeInTheDocument();

    fireEvent.click(
      within(deleted).getByRole('button', { name: 'Restore gamma title' })
    );
    expect(screen.getByText(/1 to restore/)).toBeInTheDocument();

    const review = await openReview();
    expect(review).toHaveTextContent('1 resource restored');
    expect(within(review).getByLabelText(/Commit message/)).toHaveValue(
      'docs(quickstarts): restore gamma'
    );
    fireEvent.click(
      within(review).getByRole('button', { name: 'Save to PR #88' })
    );
    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(1));
    expect(mocked.submit.mock.calls[0][1]).toEqual([
      { name: 'gamma', revert: true, files: [] },
    ]);
    await waitFor(() =>
      expect(screen.queryByText('Deleted in PR')).not.toBeInTheDocument()
    );
  });

  it('groups the sidebar: renamed, then open, then deleted', async () => {
    renderWorkspace();
    await openPR({
      resources: [
        atHead('alpha'),
        { ...atHead('delta'), renamedFrom: 'delta-old' },
        atHead('beta'),
      ],
      deleted: [atHead('gamma')],
    });
    expect(sidebarOrder()).toEqual([
      'delta title · Renamed from delta-old',
      'alpha title',
      'beta title',
      'gamma title · Deleted in PR',
    ]);
    // A thin rule where each group starts.
    expect(
      within(sidebar())
        .getAllByRole('listitem')
        .map((li) => li.classList.contains('pf-m-group-start'))
    ).toEqual([false, true, false, true]);
    // Restore is an icon with a tooltip, not a text link.
    expect(
      screen.getByRole('button', { name: 'Restore gamma title' })
    ).toHaveTextContent('');

    // A deletion joins the end of the bottom group.
    await waitFor(() => expect(mocked.listRepo).toHaveBeenCalled());
    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for alpha title' })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete resource' })
    );
    await waitFor(() =>
      expect(sidebarOrder()).toEqual([
        'delta title · Renamed from delta-old',
        'beta title',
        'gamma title · Deleted in PR',
        'alpha title · To delete',
      ])
    );

    // Restoring keeps the row where it is.
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore gamma title' })
    );
    expect(sidebarOrder()).toEqual([
      'delta title · Renamed from delta-old',
      'beta title',
      'gamma title · Restored on save',
      'alpha title · To delete',
    ]);

    // Undoing the deletion reopens it with the other open resources.
    fireEvent.click(screen.getByRole('button', { name: 'Keep alpha title' }));
    expect(sidebarOrder()).toEqual([
      'delta title · Renamed from delta-old',
      'beta title',
      'alpha title',
      'gamma title · Restored on save',
    ]);

    // Changing its ID, even before saving, makes it a rename.
    typeInto(combinedFor('alpha').replace('name: alpha', 'name: alpha-two'));
    expect(sidebarOrder()).toEqual([
      'delta title · Renamed from delta-old',
      'alpha title (unsaved)',
      'beta title',
      'gamma title · Restored on save',
    ]);
    expect(sidebarRow('alpha title (unsaved)')).toHaveTextContent(
      'alpha → alpha-two'
    );
  });
});
