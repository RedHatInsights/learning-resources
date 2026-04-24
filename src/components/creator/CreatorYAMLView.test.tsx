import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import CreatorYAMLView from './CreatorYAMLView';
import { DEFAULT_QUICKSTART_YAML } from '../../data/quickstart-templates';

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

describe('CreatorYAMLView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders both toolbar buttons', () => {
    render(<CreatorYAMLView />);
    expect(
      screen.getByRole('button', { name: /load sample template/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /load from file/i })
    ).toBeInTheDocument();
  });

  it('renders hidden file input with correct accept attribute', () => {
    render(<CreatorYAMLView />);
    const fileInput = screen.getByTestId('yaml-file-input');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', '.yaml,.yml');
    expect(fileInput).not.toBeVisible();
  });

  describe('Load Sample Template', () => {
    it('loads sample YAML into editor without confirm when content is placeholder', () => {
      const confirmSpy = jest.spyOn(window, 'confirm');
      render(<CreatorYAMLView />);

      fireEvent.click(
        screen.getByRole('button', { name: /load sample template/i })
      );

      const editor = screen.getByTestId('mock-monaco-editor');
      expect(editor).toHaveValue(DEFAULT_QUICKSTART_YAML);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('shows confirmation when editor has user content', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      render(<CreatorYAMLView />);

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
      render(<CreatorYAMLView />);
      const fileInput = screen.getByTestId('yaml-file-input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      fireEvent.click(screen.getByRole('button', { name: /load from file/i }));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('opens file picker after user confirms overwrite of real content', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      render(<CreatorYAMLView />);
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
      render(<CreatorYAMLView />);

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
      render(<CreatorYAMLView />);
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
      render(<CreatorYAMLView onChangeQuickStartSpec={onChangeSpec} />);

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
      render(
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

      render(<CreatorYAMLView />);

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

      render(<CreatorYAMLView />);

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
      render(<CreatorYAMLView onChangeQuickStartSpec={onChangeSpec} />);

      const fileInput = screen.getByTestId('yaml-file-input');
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(onChangeSpec).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.queryByText(/YAML Parse Error/i)).not.toBeInTheDocument();
    });
  });

  describe('editor onChange', () => {
    it('debounces parse updates', () => {
      const onChangeSpec = jest.fn();
      render(<CreatorYAMLView onChangeQuickStartSpec={onChangeSpec} />);

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
