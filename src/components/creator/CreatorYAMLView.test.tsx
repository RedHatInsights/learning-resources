import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import CreatorYAMLView from './CreatorYAMLView';
import { CreatorWizardContext } from './context';
import { CreatorFiles } from './types';
import { DEFAULT_QUICKSTART_YAML } from '../../data/quickstart-templates';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';

// Mock downloadFile from frontend-components-utilities
const mockDownloadFile = jest.fn();
jest.mock(
  '@redhat-cloud-services/frontend-components-utilities/helpers',
  () => ({
    downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
  })
);

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
  files: CreatorFiles = MOCK_FILES
) => {
  return render(
    <CreatorWizardContext.Provider
      value={{
        files,
        onChangeCurrentStage: jest.fn(),
        resetCreator: jest.fn(),
      }}
    >
      {ui}
    </CreatorWizardContext.Provider>
  );
};

describe('CreatorYAMLView', () => {
  beforeEach(() => {
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
});
