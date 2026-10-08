import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import MultiEditWorkspace from './MultiEditWorkspace';
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
  useChrome: () => ({ auth: { getUser: mockGetUser } }),
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
  const MockDiffEditor = ({
    original,
    modified,
  }: {
    original: string;
    modified: string;
  }) => (
    <pre data-testid="mock-diff">
      {original}
      {'---'}
      {modified}
    </pre>
  );
  return { __esModule: true, default: MockEditor, DiffEditor: MockDiffEditor };
});

jest.mock('../CreatorPreview', () => ({
  __esModule: true,
  default: ({ quickStart }: { quickStart: ExtendedQuickstart }) => (
    <div data-testid="preview">{quickStart.spec.displayName}</div>
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

const contentFor = (name: string) =>
  `# comment kept\nmetadata:\n  name: ${name}\nspec:\n  displayName: ${name} title\n  link:\n    href: https://old.example.com/${name}\n`;

const repoContent = (name: string) => ({
  name,
  headSha: 'base-sha',
  files: [
    {
      name: 'metadata.yml',
      content: `kind: QuickStarts\nname: ${name}\ntags: []\n`,
    },
    { name: `${name}.yml`, content: contentFor(name) },
  ],
});

const addResources = async (...names: string[]) => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Add resources' })[0]);
  const dialog = await screen.findByRole('dialog', { name: 'Add resources' });
  for (const name of names) {
    const row = (
      await within(dialog).findByText(`docs/quickstarts/${name}`)
    ).closest('tr')!;
    fireEvent.click(within(row).getByRole('checkbox'));
  }
  fireEvent.click(
    within(dialog).getByRole('button', { name: /^Add \d+ resource/ })
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Add resources' })
    ).not.toBeInTheDocument()
  );
};

const renderWorkspace = () => render(<MultiEditWorkspace filterMap={{}} />);

describe('MultiEditWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('starts empty and offers both ways in', () => {
    renderWorkspace();
    expect(screen.getByText('No resources yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Review changes' })
    ).toBeDisabled();
  });

  it('adds selected resources, grouped by directory, with a preview', async () => {
    renderWorkspace();
    await addResources('alpha', 'beta');

    expect(
      screen.getByRole('heading', { name: 'Editing 2 resources' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Not saved to a PR yet', { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-monaco-editor')).toHaveValue(
      contentFor('alpha')
    );
    expect(screen.getByTestId('preview')).toHaveTextContent('alpha title');
    expect(mocked.getRepo).toHaveBeenCalledTimes(2);
  });

  it('opens one PR for every changed resource, then appends to it', async () => {
    mocked.submit
      .mockResolvedValueOnce({
        prUrl: 'https://github.com/o/r/pull/77',
        prNumber: 77,
        branchName: 'qs-update-batch-1',
        headSha: 'head-1',
        status: 'created',
        paths: [],
      })
      .mockResolvedValueOnce({
        prUrl: 'https://github.com/o/r/pull/77',
        prNumber: 77,
        branchName: 'qs-update-batch-1',
        headSha: 'head-2',
        status: 'updated',
        paths: [],
      });

    renderWorkspace();
    await addResources('alpha', 'beta');

    const editor = screen.getByTestId('mock-monaco-editor');
    const alphaEdited = contentFor('alpha').replace(
      'old.example.com',
      'new.example.com'
    );
    fireEvent.change(editor, { target: { value: alphaEdited } });

    fireEvent.click(screen.getByText('beta.yml'));
    const betaEdited = contentFor('beta').replace(
      'old.example.com',
      'new.example.com'
    );
    fireEvent.change(screen.getByTestId('mock-monaco-editor'), {
      target: { value: betaEdited },
    });

    // Switching back keeps the unsaved alpha buffer.
    fireEvent.click(screen.getByText('alpha.yml'));
    expect(screen.getByTestId('mock-monaco-editor')).toHaveValue(alphaEdited);
    expect(
      screen.getByText('2 files have unsaved changes', { exact: false })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    let dialog = await screen.findByRole('dialog', { name: 'Review changes' });
    expect(
      within(dialog).getByText('2 files in 2 resources')
    ).toBeInTheDocument();
    const create = within(dialog).getByRole('button', { name: 'Create PR' });
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
    expect(createMeta.prBody).toContain('- docs/quickstarts/alpha/');
    expect(createMeta.commitMessage).toContain(
      'Co-authored-by: Doc Author <author@redhat.com>'
    );
    expect(createResources).toEqual([
      { name: 'alpha', files: [{ name: 'alpha.yml', content: alphaEdited }] },
      { name: 'beta', files: [{ name: 'beta.yml', content: betaEdited }] },
    ]);

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Review changes' })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: 'PR #77' })).toBeInTheDocument();
    expect(
      screen.getByText('No unsaved changes', { exact: false })
    ).toBeInTheDocument();

    // A second edit saves to the same PR against the head the first save returned.
    fireEvent.change(screen.getByTestId('mock-monaco-editor'), {
      target: { value: alphaEdited + '# more\n' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    dialog = await screen.findByRole('dialog', { name: 'Review changes' });
    expect(
      within(dialog).queryByLabelText(/Pull request title/)
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save changes to PR #77' })
    );

    await waitFor(() => expect(mocked.submit).toHaveBeenCalledTimes(2));
    const [updateMeta, updateResources] = mocked.submit.mock.calls[1];
    expect(updateMeta).toEqual(
      expect.objectContaining({ prNumber: 77, expectedHeadSha: 'head-1' })
    );
    expect(updateMeta.branchName).toBeUndefined();
    expect(updateResources).toEqual([
      {
        name: 'alpha',
        files: [{ name: 'alpha.yml', content: alphaEdited + '# more\n' }],
      },
    ]);
  });

  it('keeps edits dirty and explains a conflict', async () => {
    mocked.submit.mockRejectedValueOnce(
      new QuickstartsAPIError(
        'pull request #77 has new commits; reload it before saving',
        409
      )
    );
    renderWorkspace();
    await addResources('alpha');
    fireEvent.change(screen.getByTestId('mock-monaco-editor'), {
      target: { value: 'a: 1\n' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Review changes',
    });
    fireEvent.change(within(dialog).getByLabelText(/Pull request title/), {
      target: { value: 'Update' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create PR' }));

    expect(
      await within(dialog).findByText(
        'The pull request changed since it was loaded'
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/has new commits/)).toBeInTheDocument();
    expect(screen.getByTestId('mock-monaco-editor')).toHaveValue('a: 1\n');
  });

  it('refuses to save invalid YAML and names the file', async () => {
    renderWorkspace();
    await addResources('alpha');
    fireEvent.change(screen.getByTestId('mock-monaco-editor'), {
      target: { value: 'spec: [unclosed' },
    });
    expect(screen.getByText(/^Invalid YAML:/)).toBeInTheDocument();
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Review changes',
    });
    fireEvent.change(within(dialog).getByLabelText(/Pull request title/), {
      target: { value: 'Update' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create PR' }));

    expect(
      await within(dialog).findByText('Fix invalid YAML before saving')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/docs\/quickstarts\/alpha\/alpha\.yml:/)
    ).toBeInTheDocument();
    expect(mocked.submit).not.toHaveBeenCalled();
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
    mocked.getWorkspace.mockResolvedValue({
      number: 88,
      title: 'Update Inventory docs',
      htmlUrl: 'https://github.com/o/r/pull/88',
      branchName: 'qs-update-batch-9',
      headSha: 'head-88',
      missing: [],
      resources: [
        {
          name: 'alpha',
          path: 'docs/quickstarts/alpha',
          files: repoContent('alpha').files.map((f) => ({
            ...f,
            path: `docs/quickstarts/alpha/${f.name}`,
          })),
        },
      ],
    });
    mocked.getResource.mockResolvedValue({
      headSha: 'head-88',
      resource: {
        name: 'gamma',
        path: 'docs/quickstarts/gamma',
        files: repoContent('gamma').files.map((f) => ({
          ...f,
          path: `docs/quickstarts/gamma/${f.name}`,
        })),
      },
    });

    renderWorkspace();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Continue open PR' })[0]
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
    expect(
      screen.getByText('No unsaved changes', { exact: false })
    ).toBeInTheDocument();

    await addResources('gamma');
    expect(mocked.getResource).toHaveBeenCalledWith(88, 'gamma', 'head-88');
    expect(mocked.getRepo).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Editing 2 resources' })
    ).toBeInTheDocument();
  });
});
