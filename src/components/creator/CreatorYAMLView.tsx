import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  PageSection,
} from '@patternfly/react-core';
import { FileImportIcon, UploadIcon } from '@patternfly/react-icons';
import Editor from '@monaco-editor/react';
import YAML from 'yaml';
import { QuickStartSpec } from '@patternfly/quickstarts';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import './CreatorYAMLView.scss';
import { DEFAULT_QUICKSTART_YAML } from '../../data/quickstart-templates';

const PLACEHOLDER_YAML =
  '# YAML Quickstart Definition\n# Start typing or paste your YAML here\n';

const isUserContent = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed !== '' && content !== PLACEHOLDER_YAML;
};

export type CreatorYAMLViewProps = {
  onChangeQuickStartSpec?: (newValue: QuickStartSpec) => void;
  onChangeBundles?: (newValue: string[]) => void;
  onChangeTags?: (tags: { [kind: string]: string[] }) => void;
  onChangeMetadataTags?: (tags: Array<{ kind: string; value: string }>) => void;
};

const CreatorYAMLView: React.FC<CreatorYAMLViewProps> = ({
  onChangeQuickStartSpec,
  onChangeBundles,
  onChangeTags,
  onChangeMetadataTags,
}) => {
  const [yamlContent, setYamlContent] = useState<string>(PLACEHOLDER_YAML);
  const [parseError, setParseError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const configureMonacoEnvironment = () => {
    // Disable Monaco workers to prevent CDN fetching in CI environments
    self.MonacoEnvironment = {
      getWorker() {
        return new Worker(
          URL.createObjectURL(
            new Blob(['self.onmessage = () => {}'], { type: 'text/javascript' })
          )
        );
      },
    };
  };

  const parseAndUpdateQuickstart = (content: string) => {
    try {
      const parsed = YAML.parse(content);

      if (!parsed) {
        setParseError('Empty YAML content');
        return;
      }

      // Extract metadata
      const metadata = parsed.metadata || {};
      const spec = parsed.spec || {};

      // Build the quickstart object
      const quickstart: ExtendedQuickstart = {
        metadata: {
          name: metadata.name || 'untitled-quickstart',
          tags: metadata.tags || [],
        },
        spec: {
          displayName: spec.displayName || '',
          description: spec.description || '',
          icon: spec.icon || null,
          type: spec.type,
          durationMinutes: spec.durationMinutes,
          link: spec.link,
          prerequisites: spec.prerequisites,
          introduction: spec.introduction,
          tasks: spec.tasks,
        },
      };

      // Update state
      setParseError(null);

      // Extract bundles and tags
      const bundles: string[] = [];
      const tagsByKind: { [kind: string]: string[] } = {};

      if (Array.isArray(metadata.tags)) {
        metadata.tags.forEach((tag: { kind?: string; value?: string }) => {
          if (tag.kind === 'bundle' && tag.value) {
            bundles.push(tag.value);
          } else if (tag.kind && tag.value) {
            if (!tagsByKind[tag.kind]) {
              tagsByKind[tag.kind] = [];
            }
            tagsByKind[tag.kind].push(tag.value);
          }
        });
      }

      // Call the callbacks with updated data
      // NOTE: We don't call onChangeKind here because in YAML mode, the kind info
      // is already embedded in the spec (spec.type). Calling onChangeKind would
      // trigger wizard-mode logic that overwrites our YAML values with defaults.
      // The spec.type already contains the kind information for the preview.
      if (onChangeBundles) {
        onChangeBundles(bundles);
      }
      if (onChangeTags) {
        onChangeTags(tagsByKind);
      }
      // Update metadata.tags directly so findQuickstartFilterTags can read them
      if (onChangeMetadataTags) {
        onChangeMetadataTags(metadata.tags || []);
      }
      if (onChangeQuickStartSpec) {
        onChangeQuickStartSpec(quickstart.spec);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid YAML syntax';
      setParseError(errorMessage);
      // Keep using the last valid quickstart state on error
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const content = value || '';
    setYamlContent(content);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced update (200ms delay)
    debounceTimerRef.current = setTimeout(() => {
      parseAndUpdateQuickstart(content);
    }, 200);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const confirmOverwriteIfDirty = (message: string): boolean => {
    if (!isUserContent(yamlContent)) return true;
    return window.confirm(message);
  };

  const handleLoadSample = () => {
    if (
      !confirmOverwriteIfDirty(
        'This will overwrite your current work. Are you sure?'
      )
    )
      return;
    setYamlContent(DEFAULT_QUICKSTART_YAML);
    parseAndUpdateQuickstart(DEFAULT_QUICKSTART_YAML);
  };

  const handleLoadFromFile = () => {
    if (
      !confirmOverwriteIfDirty(
        'Loading a file will overwrite your current work. Are you sure?'
      )
    )
      return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setYamlContent(content);
        parseAndUpdateQuickstart(content);
      }
    };
    reader.onerror = () => {
      setParseError(
        `Failed to read file: ${reader.error?.message ?? 'unknown error'}`
      );
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-selected
    event.target.value = '';
  };

  return (
    <PageSection className="lr-c-creator-yaml-view">
      {parseError && (
        <Alert
          variant="warning"
          title="YAML Parse Error"
          className="pf-v6-u-mb-md"
          isInline
        >
          {parseError}. Showing previous valid state in preview.
        </Alert>
      )}
      <Flex
        spaceItems={{ default: 'spaceItemsSm' }}
        className="lr-c-creator-yaml-view__toolbar"
      >
        <FlexItem>
          <Button
            variant="secondary"
            icon={<FileImportIcon />}
            onClick={handleLoadSample}
            size="sm"
          >
            Load Sample Template
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            icon={<UploadIcon />}
            onClick={handleLoadFromFile}
            size="sm"
          >
            Load from File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
            data-testid="yaml-file-input"
          />
        </FlexItem>
      </Flex>
      <div className="lr-c-creator-yaml-view__editor">
        <Editor
          height="100%"
          language="yaml"
          theme="vs"
          value={yamlContent}
          onChange={handleEditorChange}
          beforeMount={configureMonacoEnvironment}
          options={{
            automaticLayout: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            fontSize: 14,
            lineNumbers: 'on',
            folding: true,
            renderWhitespace: 'selection',
          }}
        />
      </div>
    </PageSection>
  );
};

export default CreatorYAMLView;
