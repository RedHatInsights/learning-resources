import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import CreatorYAMLView from './CreatorYAMLView';
import { CreatorWizardContext, ResumePR } from './context';
import { CreatorFiles } from './types';
import { DEFAULT_QUICKSTART_YAML } from '../../data/quickstart-templates';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import {
  createQuickstartPR,
  getCreatorPR,
  getRepoQuickstartContent,
  listCreatorPRs,
  listRepoQuickstarts,
} from '../../utils/createQuickstartPR';

// Mock downloadFile from frontend-components-utilities
const mockDownloadFile = jest.fn();
jest.mock(
  '@redhat-cloud-services/frontend-components-utilities/helpers',
  () => ({
    downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
  })
);

// Mock useChrome for SSO user email (co-authored-by)
const mockGetUser = jest.fn().mockResolvedValue({
  identity: {
    user: {
      email: 'testuser@redhat.com',
      first_name: 'Test',
      last_name: 'User',
    },
  },
});
jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => ({
  __esModule: true,
  useChrome: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

let mockGitServiceFlag = false;
jest.mock('@unleash/proxy-client-react', () => ({
  useFlag: () => mockGitServiceFlag,
}));

// Mock Monaco Editor — render a simple textarea that mirrors onChange behavior
jest.mock('@monaco-editor/react', () => {
  const MockEditor = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string | undefined) => void;
  }) => (
    <textarea
      data-testid="mock-monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  MockEditor.displayName = 'MockEditor';
  return { __esModule: true, default: MockEditor };
});

jest.mock('../../utils/createQuickstartPR', () => ({
  createQuickstartPR: jest.fn(),
  listRepoQuickstarts: jest.fn().mockResolvedValue([]),
  getRepoQuickstartContent: jest
    .fn()
    .mockResolvedValue({ name: '', files: [] }),
  listCreatorPRs: jest.fn().mockResolvedValue([]),
  getCreatorPR: jest.fn().mockResolvedValue({
    number: 0,
    title: '',
    htmlUrl: '',
    branchName: '',
    slug: '',
    files: [],
  }),
}));

const mockedCreatePR = createQuickstartPR as jest.MockedFunction<
  typeof createQuickstartPR
>;
const mockedListRepoQuickstarts = listRepoQuickstarts as jest.MockedFunction<
  typeof listRepoQuickstarts
>;
const mockedGetRepoQuickstartContent =
  getRepoQuickstartContent as jest.MockedFunction<
    typeof getRepoQuickstartContent
  >;
const mockedListCreatorPRs = listCreatorPRs as jest.MockedFunction<
  typeof listCreatorPRs
>;
const mockedGetCreatorPR = getCreatorPR as jest.MockedFunction<
  typeof getCreatorPR
>;

const MOCK_FILES: CreatorFiles = [
  { name: 'metadata.yaml', content: 'kind: QuickStarts\nname: test\n' },
  { name: 'test.yaml', content: 'spec:\n  displayName: Test\n' },
];

const MOCK_QUICKSTART: ExtendedQuickstart = {
  metadata: {
    name: 'my-quickstart',
    tags: [
      { kind: 'bundle', value: 'insights' },
      { kind: 'content', value: 'quickstart' },
    ],
  },
  spec: {
    displayName: 'My Quick Start',
    description: 'A sample quickstart for testing',
    icon: null,
    type: { text: 'Quick start', color: 'green' },
    durationMinutes: 10,
    tasks: [
      {
        title: 'First Task',
        description: 'Do something',
        review: {
          instructions: 'Check it worked',
          failedTaskHelp: 'Try again',
        },
      },
    ],
  },
};

const renderWithContext = (
  ui: React.ReactElement,
  files: CreatorFiles = MOCK_FILES,
  setResumePR: jest.Mock = jest.fn(),
  initialPR: ResumePR | null = null
) => {
  const ContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [resumePR, setPR] = React.useState(initialPR);
    return (
      <CreatorWizardContext.Provider
        value={{
          files,
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
  };
  return {
    setResumePR,
    ...render(ui, { wrapper: ContextProvider }),
  };
};

describe('CreatorYAMLView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockDownloadFile.mockClear();
  });

  it('renders both toolbar buttons', () => {
    renderWithContext(<CreatorYAMLView />);
    expect(
      screen.getByRole('button', { name: /load sample template/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /load from file/i })
    ).toBeInTheDocument();
  });

  it('renders hidden file input with correct accept attribute', () => {
    renderWithContext(<CreatorYAMLView />);
    const fileInput = screen.getByTestId('yaml-file-input');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', '.yaml,.yml');
    expect(fileInput).not.toBeVisible();
  });

  describe('Wizard-to-YAML sync', () => {
    it('initializes editor with serialized wizard state when quickStart has data', () => {
      renderWithContext(
        <CreatorYAMLView
          quickStart={MOCK_QUICKSTART}
          currentBundles={['insights']}
          currentTags={{ content: ['quickstart'] }}
        />
      );

      const editor = screen.getByTestId('mock-monaco-editor');
      const content = (editor as HTMLTextAreaElement).value;

      expect(content).toContain('displayName: My Quick Start');
      expect(content).toContain('description: A sample quickstart for testing');
      expect(content).toContain('durationMinutes: 10');
      expect(content).toContain('value: insights');
      expect(content).toContain('value: quickstart');
    });

    it('shows placeholder when quickStart has no displayName', () => {
      const emptyQS: ExtendedQuickstart = {
        metadata: { name: 'test', tags: [] },
        spec: { displayName: '', icon: null, description: '' },
      };
      renderWithContext(<CreatorYAMLView quickStart={emptyQS} />);

      const editor = screen.getByTestId('mock-monaco-editor');
      expect((editor as HTMLTextAreaElement).value).toContain(
        '# YAML Quickstart Definition'
      );
    });

    it('calls onChangeKind when YAML has a recognized spec.type', async () => {
      const onChangeKind = jest.fn();
      renderWithContext(<CreatorYAMLView onChangeKind={onChangeKind} />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: test\nspec:\n  displayName: Test\n  type:\n    text: Documentation\n    color: orange\n',
        },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(onChangeKind).toHaveBeenCalledWith('documentation');
      });
    });

    it('calls onChangeKind with null for unknown type', async () => {
      const onChangeKind = jest.fn();
      renderWithContext(<CreatorYAMLView onChangeKind={onChangeKind} />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: test\nspec:\n  displayName: Test\n  type:\n    text: Unknown Type\n',
        },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(onChangeKind).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Validation', () => {
    it('shows validation warnings for missing required fields', async () => {
      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: { value: 'spec:\n  version: 1\n' },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Schema Validation/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/metadata\.name/)).toBeInTheDocument();
      expect(screen.getByText(/spec\.displayName/)).toBeInTheDocument();
      expect(screen.getByText(/spec\.description/)).toBeInTheDocument();
    });

    it('shows warning for unknown tag kind', async () => {
      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: test\n  tags:\n    - kind: invalid-kind\n      value: foo\nspec:\n  displayName: Test\n  description: Desc\n',
        },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Unknown tag kind/)).toBeInTheDocument();
      });
    });

    it('shows warning for unknown spec fields', async () => {
      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: test\nspec:\n  displayName: Test\n  description: Desc\n  customField: value\n',
        },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/spec\.customField/)).toBeInTheDocument();
        expect(screen.getByText(/Unknown field/)).toBeInTheDocument();
      });
    });

    it('shows no warnings for valid YAML', async () => {
      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: test\n  tags:\n    - kind: bundle\n      value: insights\nspec:\n  displayName: Test\n  description: Desc\n',
        },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/Schema Validation/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Load Sample Template', () => {
    it('loads sample YAML into editor without confirm when content is placeholder', () => {
      const confirmSpy = jest.spyOn(window, 'confirm');
      renderWithContext(<CreatorYAMLView />);

      fireEvent.click(
        screen.getByRole('button', { name: /load sample template/i })
      );

      const editor = screen.getByTestId('mock-monaco-editor');
      expect(editor).toHaveValue(DEFAULT_QUICKSTART_YAML);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('shows confirmation when editor has user content', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithContext(<CreatorYAMLView />);

      // Type real content to make the editor "dirty"
      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: { value: 'metadata:\n  name: test\n' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /load sample template/i })
      );

      expect(confirmSpy).toHaveBeenCalledWith(
        'This will overwrite your current work. Are you sure?'
      );
    });
  });

  describe('Load from File', () => {
    it('opens file picker without confirm when content is placeholder', () => {
      const confirmSpy = jest.spyOn(window, 'confirm');
      renderWithContext(<CreatorYAMLView />);
      const fileInput = screen.getByTestId('yaml-file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      fireEvent.click(screen.getByRole('button', { name: /load from file/i }));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('opens file picker after user confirms overwrite of real content', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithContext(<CreatorYAMLView />);
      const fileInput = screen.getByTestId('yaml-file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      // Type real content first
      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: { value: 'metadata:\n  name: test\n' },
      });

      fireEvent.click(screen.getByRole('button', { name: /load from file/i }));

      expect(clickSpy).toHaveBeenCalled();
    });

    it('shows confirmation when editor has user content before opening file picker', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithContext(<CreatorYAMLView />);

      // Type real content first
      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: { value: 'metadata:\n  name: test\n' },
      });

      fireEvent.click(screen.getByRole('button', { name: /load from file/i }));

      expect(confirmSpy).toHaveBeenCalledWith(
        'Loading a file will overwrite your current work. Are you sure?'
      );
    });

    it('does not open file picker when user cancels confirmation', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithContext(<CreatorYAMLView />);
      const fileInput = screen.getByTestId('yaml-file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      // Type real content first
      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: { value: 'metadata:\n  name: test\n' },
      });

      fireEvent.click(screen.getByRole('button', { name: /load from file/i }));

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('loads selected YAML file into editor and triggers parse', async () => {
      const yamlContent = `metadata:\n  name: test-qs\nspec:\n  displayName: Test QS\n`;
      const mockFile = new File([yamlContent], 'test.yaml', {
        type: 'application/x-yaml',
      });

      const onChangeSpec = jest.fn();
      renderWithContext(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeSpec} />
      );

      const fileInput = screen.getByTestId('yaml-file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        const editor = screen.getByTestId('mock-monaco-editor');
        expect(editor).toHaveValue(yamlContent);
      });

      await waitFor(() => {
        expect(onChangeSpec).toHaveBeenCalledWith(
          expect.objectContaining({ displayName: 'Test QS' })
        );
      });
    });

    it('propagates metadata.name so the generated files match the editor', async () => {
      const onChangeMetadataName = jest.fn();
      renderWithContext(
        <CreatorYAMLView onChangeMetadataName={onChangeMetadataName} />
      );

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value: `metadata:\n  name: renamed-doc\nspec:\n  displayName: Getting started with automation hub\n`,
        },
      });

      await waitFor(() => {
        expect(onChangeMetadataName).toHaveBeenCalledWith('renamed-doc');
      });
    });

    it('reports an empty metadata.name so the title can drive the slug again', async () => {
      const onChangeMetadataName = jest.fn();
      renderWithContext(
        <CreatorYAMLView onChangeMetadataName={onChangeMetadataName} />
      );

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: { value: `spec:\n  displayName: Brand new doc\n` },
      });

      await waitFor(() => {
        expect(onChangeMetadataName).toHaveBeenCalledWith('');
      });
    });

    it('calls onChangeBundles and onChangeTags for tagged YAML', async () => {
      const yamlContent = `metadata:
  name: tagged-qs
  tags:
    - kind: bundle
      value: insights
    - kind: content
      value: quickstart
spec:
  displayName: Tagged QS
`;
      const mockFile = new File([yamlContent], 'tagged.yaml', {
        type: 'application/x-yaml',
      });

      const onChangeBundles = jest.fn();
      const onChangeTags = jest.fn();
      renderWithContext(
        <CreatorYAMLView
          onChangeBundles={onChangeBundles}
          onChangeTags={onChangeTags}
        />
      );

      const fileInput = screen.getByTestId('yaml-file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(onChangeBundles).toHaveBeenCalledWith(['insights']);
      });

      await waitFor(() => {
        expect(onChangeTags).toHaveBeenCalledWith({
          content: ['quickstart'],
        });
      });
    });

    it('shows parse error for invalid YAML', async () => {
      const invalidYaml = `invalid: [unclosed`;
      const mockFile = new File([invalidYaml], 'bad.yaml', {
        type: 'application/x-yaml',
      });

      renderWithContext(<CreatorYAMLView />);

      const fileInput = screen.getByTestId('yaml-file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText(/YAML Parse Error/i)).toBeInTheDocument();
      });
      // Also verify the dynamic parser message is surfaced
      await waitFor(() => {
        expect(
          screen.getByText(/Showing previous valid state in preview/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error when FileReader fails', async () => {
      const mockFile = new File(['content'], 'test.yaml', {
        type: 'application/x-yaml',
      });

      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      const mockReader = {
        readAsText: jest.fn(),
        onerror: null as (() => void) | null,
        onload: null as ((e: unknown) => void) | null,
        error: { message: 'Permission denied' },
      };
      global.FileReader = jest.fn(
        () => mockReader
      ) as unknown as typeof FileReader;

      renderWithContext(<CreatorYAMLView />);

      const fileInput = screen.getByTestId('yaml-file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      // Trigger the error callback
      act(() => {
        mockReader.onerror?.();
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to read file: Permission denied/i)
        ).toBeInTheDocument();
      });

      global.FileReader = originalFileReader;
    });

    it('does nothing when no file is selected', () => {
      const confirmSpy = jest.spyOn(window, 'confirm');
      const onChangeSpec = jest.fn();
      renderWithContext(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeSpec} />
      );

      const fileInput = screen.getByTestId('yaml-file-input');
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(onChangeSpec).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.queryByText(/YAML Parse Error/i)).not.toBeInTheDocument();
    });
  });

  describe('Download Files', () => {
    it('renders download button', () => {
      renderWithContext(<CreatorYAMLView />);
      expect(
        screen.getByRole('button', { name: /download files/i })
      ).toBeInTheDocument();
    });

    it('disables download button when editor has placeholder content', () => {
      renderWithContext(<CreatorYAMLView />);
      const downloadBtn = screen.getByRole('button', {
        name: /download files/i,
      });
      expect(downloadBtn).toBeDisabled();
    });

    it('enables download button after loading valid YAML', () => {
      renderWithContext(<CreatorYAMLView />);
      const editor = screen.getByTestId('mock-monaco-editor');

      fireEvent.change(editor, {
        target: {
          value: `metadata:\n  name: test-qs\nspec:\n  displayName: Test\n`,
        },
      });

      // Flush debounce to clear parseError
      act(() => {
        jest.advanceTimersByTime(200);
      });

      const downloadBtn = screen.getByRole('button', {
        name: /download files/i,
      });
      expect(downloadBtn).not.toBeDisabled();
    });

    it('downloads files from context (generated by parent)', () => {
      renderWithContext(<CreatorYAMLView />);
      const editor = screen.getByTestId('mock-monaco-editor');

      // Type valid YAML to enable download
      fireEvent.change(editor, {
        target: {
          value: `metadata:\n  name: test\nspec:\n  displayName: Test\n`,
        },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const downloadBtn = screen.getByRole('button', {
        name: /download files/i,
      });
      fireEvent.click(downloadBtn);

      // Downloads the mock context files, not editor content directly
      expect(mockDownloadFile).toHaveBeenCalledTimes(2);
      expect(mockDownloadFile).toHaveBeenCalledWith(
        'kind: QuickStarts\nname: test\n',
        'metadata',
        'yaml'
      );
      expect(mockDownloadFile).toHaveBeenCalledWith(
        'spec:\n  displayName: Test\n',
        'test',
        'yaml'
      );
    });

    it('disables download button when YAML has parse error', () => {
      renderWithContext(<CreatorYAMLView />);
      const editor = screen.getByTestId('mock-monaco-editor');

      fireEvent.change(editor, {
        target: { value: 'invalid: [unclosed' },
      });

      // Flush debounce to trigger parse error
      act(() => {
        jest.advanceTimersByTime(200);
      });

      const downloadBtn = screen.getByRole('button', {
        name: /download files/i,
      });
      expect(downloadBtn).toBeDisabled();
    });
  });

  describe('editor onChange', () => {
    it('debounces parse updates', () => {
      const onChangeSpec = jest.fn();
      renderWithContext(
        <CreatorYAMLView onChangeQuickStartSpec={onChangeSpec} />
      );

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value: `metadata:\n  name: debounce-test\nspec:\n  displayName: Debounce\n`,
        },
      });

      // Should not be called immediately
      expect(onChangeSpec).not.toHaveBeenCalled();

      // After debounce timer fires
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(onChangeSpec).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Debounce' })
      );
    });
  });

  describe('Create PR button', () => {
    beforeEach(() => {
      mockGitServiceFlag = true;
    });
    afterEach(() => {
      mockGitServiceFlag = false;
    });
    it('renders Create PR button', () => {
      renderWithContext(<CreatorYAMLView />);
      expect(
        screen.getByRole('button', { name: /create pr/i })
      ).toBeInTheDocument();
    });

    it('disables Create PR button when YAML has parse error', () => {
      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, { target: { value: 'invalid: [unclosed' } });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      const prBtn = screen.getByRole('button', { name: /create pr/i });
      expect(prBtn).toBeDisabled();
    });

    it('shows success alert with PR link on success', async () => {
      mockedCreatePR.mockResolvedValueOnce({
        prUrl: 'https://github.com/org/repo/pull/99',
        branchName: 'qs-create-my-qs-123',
        commitSha: 'abc123',
        status: 'created',
      });

      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: my-qs\nspec:\n  displayName: My QS\n  description: Desc\n',
        },
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create pr/i })
        ).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /create pr/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /confirm/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(
          screen.getByText('https://github.com/org/repo/pull/99')
        ).toBeInTheDocument();
      });
    });

    it('includes co-authored-by from SSO user in commit message', async () => {
      mockedCreatePR.mockResolvedValueOnce({
        prUrl: 'https://github.com/org/repo/pull/99',
        branchName: 'qs-create-my-qs-123',
        commitSha: 'abc123',
        status: 'created',
      });

      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: my-qs\nspec:\n  displayName: My QS\n  description: Desc\n',
        },
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create pr/i })
        ).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /create pr/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /confirm/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(mockedCreatePR).toHaveBeenCalled();
      });

      const metadata = mockedCreatePR.mock.calls[0][1];
      expect(metadata.commitMessage).toContain(
        'Co-authored-by: Test User <testuser@redhat.com>'
      );
      await screen.findByText('https://github.com/org/repo/pull/99');
    });

    it('shows error alert with retry on failure', async () => {
      mockedCreatePR.mockRejectedValueOnce(new Error('Network error'));

      renderWithContext(<CreatorYAMLView />);

      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value:
            'metadata:\n  name: my-qs\nspec:\n  displayName: My QS\n  description: Desc\n',
        },
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /create pr/i })
        ).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: /create pr/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /confirm/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });
  });

  describe('Mode detection label', () => {
    beforeEach(() => {
      mockGitServiceFlag = true;
    });
    afterEach(() => {
      mockGitServiceFlag = false;
    });
    it('shows "Editing" label when quickstart name is set', async () => {
      renderWithContext(<CreatorYAMLView />);
      const editor = screen.getByTestId('mock-monaco-editor');
      fireEvent.change(editor, {
        target: {
          value: 'metadata:\n  name: brand-new-qs\nspec:\n  displayName: New\n',
        },
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText(/Editing: brand-new-qs/)).toBeInTheDocument();
      });
    });
  });

  describe('Load from Repo', () => {
    beforeEach(() => {
      mockGitServiceFlag = true;
    });
    afterEach(() => {
      mockGitServiceFlag = false;
    });
    it('renders Load from Repo button', () => {
      renderWithContext(<CreatorYAMLView />);
      expect(
        screen.getByRole('button', { name: /load from repo/i })
      ).toBeInTheDocument();
    });

    it('opens modal and shows quickstarts list', async () => {
      mockedListRepoQuickstarts.mockResolvedValueOnce([
        { name: 'getting-started', displayName: 'Getting Started' },
        { name: 'cost-mgmt', displayName: 'Cost Management' },
      ]);

      renderWithContext(<CreatorYAMLView />);
      fireEvent.click(screen.getByRole('button', { name: /load from repo/i }));

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
        expect(screen.getByText('Cost Management')).toBeInTheDocument();
      });
    });

    it('loads quickstart content into editor on selection', async () => {
      jest.useRealTimers();

      mockedListRepoQuickstarts.mockResolvedValueOnce([
        { name: 'getting-started', displayName: 'Getting Started' },
      ]);
      const yamlContent =
        'metadata:\n  name: getting-started\nspec:\n  displayName: GS\n';
      mockedGetRepoQuickstartContent.mockResolvedValueOnce({
        name: 'getting-started',
        files: [
          { name: 'metadata.yaml', content: 'kind: QuickStarts\n' },
          { name: 'getting-started.yml', content: yamlContent },
        ],
      });

      renderWithContext(<CreatorYAMLView />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /load from repo/i })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Getting Started' }));

      // Flush the async handleLoadFromRepo + React state updates
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockedGetRepoQuickstartContent).toHaveBeenCalledWith(
        'getting-started'
      );
      const editor = screen.getByTestId('mock-monaco-editor');
      const editorValue = (editor as HTMLTextAreaElement).value;
      expect(editorValue).toContain('kind: QuickStarts');
      expect(editorValue).toContain('name: getting-started');
      expect(editorValue).toContain('displayName: GS');
    });

    it('loads content YAML and merges tags from metadata.yml', async () => {
      jest.useRealTimers();

      mockedListRepoQuickstarts.mockResolvedValueOnce([
        { name: 'subs-simple', displayName: 'Simple Content Access' },
      ]);
      const contentYaml =
        'metadata:\n  name: subs-simple\nspec:\n  displayName: Simple Content Access\n';
      mockedGetRepoQuickstartContent.mockResolvedValueOnce({
        name: 'subs-simple',
        files: [
          {
            name: 'metadata.yml',
            content:
              'kind: QuickStarts\nname: subs-simple\ntags:\n- kind: bundle\n  value: subscriptions\n',
          },
          { name: 'subs-simple.yaml', content: contentYaml },
        ],
      });

      renderWithContext(<CreatorYAMLView />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /load from repo/i })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Simple Content Access')).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'Simple Content Access' })
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const editor = screen.getByTestId('mock-monaco-editor');
      const editorValue = (editor as HTMLTextAreaElement).value;
      expect(editorValue).toContain('displayName: Simple Content Access');
      expect(editorValue).toContain('value: subscriptions');
    });

    it('loads an open PR and submits updates to that same PR', async () => {
      jest.useRealTimers();
      const setResumePR = jest.fn();
      mockedListRepoQuickstarts.mockResolvedValueOnce([]);
      mockedListCreatorPRs.mockResolvedValueOnce([
        {
          number: 11,
          title: 'feat(quickstarts): create demo',
          htmlUrl: 'https://github.com/org/repo/pull/11',
          branchName: 'qs-create-demo-1',
          slug: 'demo',
        },
      ]);
      mockedCreatePR.mockResolvedValueOnce({
        prUrl: 'https://github.com/org/repo/pull/11',
        branchName: 'qs-create-demo-1',
        commitSha: 'updated-sha',
        status: 'updated',
      });
      mockedGetCreatorPR.mockResolvedValueOnce({
        number: 11,
        title: 'feat(quickstarts): create demo',
        htmlUrl: 'https://github.com/org/repo/pull/11',
        branchName: 'qs-create-demo-1',
        slug: 'demo',
        files: [
          { name: 'metadata.yml', content: 'kind: QuickStarts\n' },
          {
            name: 'demo.yml',
            content:
              'metadata:\n  name: demo\nspec:\n  displayName: Demo From PR\n',
          },
        ],
      });

      renderWithContext(<CreatorYAMLView />, MOCK_FILES, setResumePR);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /load from repo/i })
        );
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /continue open pr/i })
        ).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /continue open pr/i })
        );
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', {
            name: /#11 feat\(quickstarts\): create demo/,
          })
        ).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: /#11 feat\(quickstarts\): create demo/,
        })
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockedGetCreatorPR).toHaveBeenCalledWith(11);
      expect(setResumePR).toHaveBeenCalledWith({
        number: 11,
        branchName: 'qs-create-demo-1',
        slug: 'demo',
      });
      const editor = screen.getByTestId('mock-monaco-editor');
      expect((editor as HTMLTextAreaElement).value).toContain(
        'displayName: Demo From PR'
      );
      expect(screen.getByRole('button', { name: 'Update PR' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Update PR' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
      expect(
        await screen.findByText('PR updated successfully')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', {
          name: 'https://github.com/org/repo/pull/11',
        })
      ).toHaveAttribute('href', 'https://github.com/org/repo/pull/11');
      expect(mockedCreatePR).toHaveBeenCalledWith(
        MOCK_FILES,
        expect.objectContaining({
          isUpdate: true,
          prNumber: 11,
          branchName: 'qs-create-demo-1',
          existingPath: 'docs/quickstarts/demo/',
        })
      );
    });

    it('clears the resumed PR when loading a sample template', async () => {
      const setResumePR = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithContext(
        <CreatorYAMLView quickStart={MOCK_QUICKSTART} />,
        MOCK_FILES,
        setResumePR,
        { number: 11, branchName: 'qs-create-demo-1', slug: 'demo' }
      );
      expect(screen.getByRole('button', { name: 'Update PR' })).toBeEnabled();
      fireEvent.click(
        screen.getByRole('button', { name: /load sample template/i })
      );
      expect(setResumePR).toHaveBeenLastCalledWith(null);
      expect(screen.getByRole('button', { name: 'Create PR' })).toBeEnabled();
    });

    it('clears the resumed PR when loading a local file', async () => {
      jest.useRealTimers();
      const setResumePR = jest.fn();
      renderWithContext(
        <CreatorYAMLView quickStart={MOCK_QUICKSTART} />,
        MOCK_FILES,
        setResumePR,
        { number: 11, branchName: 'qs-create-demo-1', slug: 'demo' }
      );
      const file = new File(
        ['metadata:\n  name: local-doc\nspec:\n  displayName: Local Doc\n'],
        'local-doc.yaml',
        { type: 'text/yaml' }
      );
      fireEvent.change(screen.getByTestId('yaml-file-input'), {
        target: { files: [file] },
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create PR' })).toBeEnabled();
        expect(screen.getByTestId('mock-monaco-editor')).toHaveValue(
          'metadata:\n  name: local-doc\nspec:\n  displayName: Local Doc\n'
        );
      });
      expect(setResumePR).toHaveBeenLastCalledWith(null);
    });

    it('disables submission while loading a PR and rejects incomplete files', async () => {
      jest.useRealTimers();
      let resolvePR!: (value: Awaited<ReturnType<typeof getCreatorPR>>) => void;
      mockedGetCreatorPR.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePR = resolve;
        })
      );
      mockedListCreatorPRs.mockResolvedValueOnce([
        {
          number: 11,
          title: 'Demo',
          htmlUrl: 'https://github.com/org/repo/pull/11',
          branchName: 'qs-create-demo-1',
          slug: 'demo',
        },
      ]);
      const setResumePR = jest.fn();
      renderWithContext(
        <CreatorYAMLView quickStart={MOCK_QUICKSTART} />,
        MOCK_FILES,
        setResumePR
      );
      fireEvent.click(screen.getByRole('button', { name: /load from repo/i }));
      fireEvent.click(
        await screen.findByRole('button', { name: /continue open pr/i })
      );
      fireEvent.click(await screen.findByRole('button', { name: /#11 Demo/ }));
      expect(screen.getByRole('button', { name: 'Create PR' })).toBeDisabled();
      await act(async () =>
        resolvePR({
          number: 11,
          title: 'Demo',
          htmlUrl: 'https://github.com/org/repo/pull/11',
          branchName: 'qs-create-demo-1',
          slug: 'demo',
          files: [{ name: 'metadata.yaml', content: 'name: demo\n' }],
        })
      );
      expect(
        await screen.findByText(/No quickstart YAML file found/)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create PR' })).toBeDisabled();
      expect(setResumePR).toHaveBeenLastCalledWith(null);
    });
  });
});
