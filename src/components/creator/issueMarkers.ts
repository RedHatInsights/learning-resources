import { Monaco, OnMount } from '@monaco-editor/react';
import { ResourceIssue } from './validateResource';

type CodeEditor = Parameters<OnMount>[0];

/** Underlines each issue's line in the editor's current model. */
export function setIssueMarkers(
  editor: CodeEditor | null,
  monaco: Monaco | null,
  issues: ResourceIssue[]
) {
  const model = editor?.getModel();
  if (!model || !monaco) return;
  monaco.editor.setModelMarkers(
    model,
    'quickstart',
    issues
      .filter((issue) => issue.line <= model.getLineCount())
      .map((issue) => ({
        severity:
          issue.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        message: issue.field
          ? `${issue.field}: ${issue.message}`
          : issue.message,
        startLineNumber: issue.line,
        startColumn: model.getLineFirstNonWhitespaceColumn(issue.line) || 1,
        endLineNumber: issue.line,
        endColumn: model.getLineMaxColumn(issue.line),
      }))
  );
}

/** Scrolls the editor to a line and puts the cursor there. */
export function revealLine(editor: CodeEditor | null, line: number) {
  if (!editor) return;
  editor.revealLineInCenter(line);
  editor.setPosition({ lineNumber: line, column: 1 });
  editor.focus();
}
