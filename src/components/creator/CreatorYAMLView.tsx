import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  List,
  ListItem,
  PageSection,
  Tooltip,
} from '@patternfly/react-core';
import {
  DownloadIcon,
  FileImportIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import Editor from '@monaco-editor/react';
import YAML from 'yaml';
import { QuickStartSpec } from '@patternfly/quickstarts';
import { downloadFile } from '@redhat-cloud-services/frontend-components-utilities/helpers';
import { ExtendedQuickstart } from '../../utils/fetchQuickstarts';
import { CreatorWizardContext } from './context';
import { ALL_KIND_ENTRIES, ItemKind } from './meta';
import './CreatorYAMLView.scss';
import { DEFAULT_QUICKSTART_YAML } from '../../data/quickstart-templates';

const PLACEHOLDER_YAML =
  '# YAML Quickstart Definition\n# Start typing or paste your YAML here\n';

const isUserContent = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed !== '' && content !== PLACEHOLDER_YAML;
};

const normalizeKindLabel = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '');

/**
 * Detect ItemKind from spec.type.text by matching against known display names.
 * Normalizes whitespace so "Quick start" matches "Quickstart", etc.
 */
function detectKind(
  spec: Record<string, unknown> | undefined
): ItemKind | null {
  const typeObj = spec?.type as Record<string, unknown> | undefined;
  const typeText = typeObj?.text;
  if (typeof typeText !== 'string') return null;

  for (const [kind, meta] of ALL_KIND_ENTRIES) {
    if (normalizeKindLabel(meta.displayName) === normalizeKindLabel(typeText)) {
      return kind;
    }
  }
  return null;
}

type ValidationWarning = { field: string; message: string };

const VALID_TAG_KINDS = new Set([
  'bundle',
  'content',
  'use-case',
  'product-families',
]);

const VALID_SPEC_FIELDS = new Set([
  'displayName',
  'description',
  'icon',
  'type',
  'durationMinutes',
  'link',
  'prerequisites',
  'introduction',
  'tasks',
  'version',
]);

/**
 * Validate parsed YAML against the QuickStart schema.
 * Returns an array of warnings (non-blocking).
 */
function validateQuickstartYaml(
  parsed: Record<string, unknown>
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const spec = parsed.spec as Record<string, unknown> | undefined;

  if (!metadata?.name) {
    warnings.push({
      field: 'metadata.name',
      message: 'Required — used as file name and identifier',
    });
  }

  if (!spec?.displayName) {
    warnings.push({
      field: 'spec.displayName',
      message: 'Required — title shown on the card',
    });
  }

  if (!spec?.description) {
    warnings.push({
      field: 'spec.description',
      message: 'Required — card description text',
    });
  }

  // Validate tag kinds
  if (metadata && Array.isArray(metadata.tags)) {
    (metadata.tags as Array<{ kind?: string; value?: string }>).forEach(
      (tag, i) => {
        if (tag.kind && !VALID_TAG_KINDS.has(tag.kind)) {
          warnings.push({
            field: `metadata.tags[${i}].kind`,
            message: `Unknown tag kind "${tag.kind}". Supported: ${[
              ...VALID_TAG_KINDS,
            ].join(', ')}`,
          });
        }
        if (!tag.value) {
          warnings.push({
            field: `metadata.tags[${i}].value`,
            message: 'Tag value is required',
          });
        }
      }
    );
  }

  // Validate spec fields
  if (spec) {
    Object.keys(spec).forEach((key) => {
      if (!VALID_SPEC_FIELDS.has(key)) {
        warnings.push({
          field: `spec.${key}`,
          message: `Unknown field — may be ignored`,
        });
      }
    });
  }

  // Validate kind/type
  const kind = detectKind(spec);
  if (spec?.type && !kind) {
    const typeObj = spec.type as Record<string, unknown>;
    warnings.push({
      field: 'spec.type.text',
      message: `Unknown type "${
        typeObj?.text
      }". Supported: ${ALL_KIND_ENTRIES.map(([, m]) => m.displayName).join(
        ', '
      )}`,
    });
  }

  return warnings;
}

/**
 * Serialize current QuickStart state to a YAML string for the editor.
 */
function serializeToYaml(
  quickStart: ExtendedQuickstart,
  bundles: string[],
  tags: { [kind: string]: string[] }
): string {
  const allTags: Array<{ kind: string; value: string }> = bundles
    .toSorted()
    .map((b) => ({ kind: 'bundle', value: b }));
  Object.entries(tags).forEach(([kind, values]) => {
    values.forEach((value) => allTags.push({ kind, value }));
  });

  // Build document matching the expected YAML structure
  const doc: Record<string, unknown> = {
    kind: 'QuickStarts',
    metadata: {
      name: quickStart.metadata.name || 'untitled-quickstart',
      ...(allTags.length > 0 ? { tags: allTags } : {}),
    },
    spec: {
      ...(quickStart.spec.displayName
        ? { displayName: quickStart.spec.displayName }
        : {}),
      ...(quickStart.spec.description
        ? { description: quickStart.spec.description }
        : {}),
      ...(quickStart.spec.durationMinutes !== undefined
        ? { durationMinutes: quickStart.spec.durationMinutes }
        : {}),
      ...(quickStart.spec.type
        ? {
            type: {
              text: quickStart.spec.type.text,
              color: quickStart.spec.type.color,
            },
          }
        : {}),
      ...(quickStart.spec.link
        ? {
            link: {
              text: quickStart.spec.link.text,
              href: quickStart.spec.link.href,
            },
          }
        : {}),
      ...(quickStart.spec.prerequisites?.length
        ? { prerequisites: quickStart.spec.prerequisites }
        : {}),
      ...(quickStart.spec.introduction
        ? { introduction: quickStart.spec.introduction }
        : {}),
      ...(quickStart.spec.tasks?.length
        ? { tasks: quickStart.spec.tasks }
        : {}),
    },
  };

  return YAML.stringify(doc, { lineWidth: 0 });
}

export type CreatorYAMLViewProps = {
  onChangeQuickStartSpec?: (newValue: QuickStartSpec) => void;
  onChangeBundles?: (newValue: string[]) => void;
  onChangeTags?: (tags: { [kind: string]: string[] }) => void;
  onChangeMetadataTags?: (tags: Array<{ kind: string; value: string }>) => void;
  onChangeKind?: (kind: ItemKind | null) => void;
  quickStart?: ExtendedQuickstart;
  currentBundles?: string[];
  currentTags?: { [kind: string]: string[] };
};

const CreatorYAMLView: React.FC<CreatorYAMLViewProps> = ({
  onChangeQuickStartSpec,
  onChangeBundles,
  onChangeTags,
  onChangeMetadataTags,
  onChangeKind,
  quickStart,
  currentBundles,
  currentTags,
}) => {
  const { files } = useContext(CreatorWizardContext);

  // On mount, serialize current state to YAML if we have data from the wizard.
  // This enables switching wizard → YAML without losing data.
  const getInitialYaml = (): string => {
    const hasWizardData =
      !!currentBundles?.length ||
      !!Object.keys(currentTags || {}).length ||
      !!quickStart?.spec.displayName ||
      !!quickStart?.spec.description ||
      quickStart?.spec.durationMinutes !== undefined ||
      !!quickStart?.spec.link?.href ||
      !!quickStart?.spec.prerequisites?.length ||
      !!quickStart?.spec.introduction ||
      !!quickStart?.spec.tasks?.length;

    if (quickStart && hasWizardData) {
      return serializeToYaml(
        quickStart,
        currentBundles || [],
        currentTags || {}
      );
    }
    return PLACEHOLDER_YAML;
  };

  const [yamlContent, setYamlContent] = useState<string>(getInitialYaml);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<
    ValidationWarning[]
  >([]);

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
        setValidationWarnings([]);
        return;
      }

      // Validate structure
      const warnings = validateQuickstartYaml(parsed);
      setValidationWarnings(warnings);

      // Extract metadata
      const metadata = parsed.metadata || {};
      const spec = parsed.spec || {};

      // Build the quickstart object
      const quickstartObj: ExtendedQuickstart = {
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

      // Detect and propagate kind from spec.type
      const detectedKind = detectKind(spec);
      if (onChangeKind) {
        onChangeKind(detectedKind);
      }

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
        onChangeQuickStartSpec(quickstartObj.spec);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid YAML syntax';
      setParseError(errorMessage);
      setValidationWarnings([]);
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

  const handleDownload = () => {
    files.forEach((file) => {
      const dotIndex = file.name.lastIndexOf('.');
      const baseName =
        dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
      const extension =
        dotIndex !== -1 ? file.name.substring(dotIndex + 1) : 'txt';
      downloadFile(file.content, baseName, extension);
    });
  };

  const canDownload =
    isUserContent(yamlContent) && !parseError && files.length > 0;

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
      {validationWarnings.length > 0 && !parseError && (
        <Alert
          variant="info"
          title="Schema Validation"
          className="pf-v6-u-mb-md"
          isInline
        >
          <List>
            {validationWarnings.map((w, i) => (
              <ListItem key={i}>
                <strong>{w.field}</strong>: {w.message}
              </ListItem>
            ))}
          </List>
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
        <FlexItem>
          <Tooltip
            content="Download metadata.yaml and quickstart YAML files, same as wizard"
            position="top"
          >
            <Button
              variant="primary"
              icon={<DownloadIcon />}
              onClick={handleDownload}
              size="sm"
              isDisabled={!canDownload}
            >
              Download Files ({files.length})
            </Button>
          </Tooltip>
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
