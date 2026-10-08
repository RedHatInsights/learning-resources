import React, { useMemo, useState } from 'react';
import {
  Alert,
  FormSelect,
  FormSelectOption,
  Title,
} from '@patternfly/react-core';
import CreatorPreview from '../CreatorPreview';
import { detectKindFromSpec } from '../hydrateFromFiles';
import { CreatorWizardStage, metaForKind } from '../meta';
import { FilterMap } from '../../../utils/filtersInterface';
import { WorkspaceResource, previewForResource } from './workspace';

type ResourcePreviewProps = {
  resource: WorkspaceResource;
  filterMap: FilterMap;
};

/** Stable stage objects: CreatorPreview reacts to a stage by identity. */
function stageFor(key: string): CreatorWizardStage {
  if (key === 'overview') return { type: 'panel-overview' };
  if (key.startsWith('task-'))
    return { type: 'task', index: Number(key.slice(5)) };
  return { type: 'card' };
}

const ResourcePreview: React.FC<ResourcePreviewProps> = ({
  resource,
  filterMap,
}) => {
  const [stageKey, setStageKey] = useState('card');
  const preview = useMemo(
    () => previewForResource(resource),
    [resource.buffer]
  );

  const kind = preview.quickStart
    ? detectKindFromSpec(
        preview.quickStart.spec as unknown as Record<string, unknown>
      )
    : null;
  const kindMeta = kind ? metaForKind(kind) : null;
  const tasks = Array.isArray(preview.quickStart?.spec.tasks)
    ? preview.quickStart?.spec.tasks ?? []
    : [];
  const hasPanel = !!kindMeta?.hasTasks;

  // A task that was deleted from the YAML falls back to the overview.
  const effectiveKey =
    !hasPanel && stageKey !== 'card'
      ? 'card'
      : stageKey.startsWith('task-') &&
        Number(stageKey.slice(5)) >= tasks.length
      ? 'overview'
      : stageKey;
  const stage = useMemo(() => stageFor(effectiveKey), [effectiveKey]);

  return (
    <section className="lr-c-multi-edit__preview" aria-label="Preview">
      <div className="lr-c-multi-edit__pane-header">
        <Title headingLevel="h3" size="md">
          Preview
        </Title>
        {hasPanel && (
          <FormSelect
            className="lr-c-multi-edit__stage-select"
            value={effectiveKey}
            onChange={(_e, value) => setStageKey(value)}
            aria-label="Preview view"
          >
            <FormSelectOption value="card" label="Catalog card" />
            <FormSelectOption value="overview" label="Quick start overview" />
            {tasks.map((task, i) => (
              <FormSelectOption
                key={i}
                value={`task-${i}`}
                label={`Task ${i + 1}${
                  typeof task?.title === 'string' && task.title
                    ? `: ${task.title}`
                    : ''
                }`}
              />
            ))}
          </FormSelect>
        )}
      </div>
      <div className="lr-c-multi-edit__preview-body">
        {preview.error !== undefined ? (
          <Alert variant="warning" isInline title="Preview unavailable">
            {preview.error}
          </Alert>
        ) : (
          <PreviewBoundary resetKey={resource.buffer}>
            <CreatorPreview
              // Each resource gets its own quick start progress state.
              key={resource.name}
              kindMeta={kindMeta}
              quickStart={preview.quickStart}
              currentStage={stage}
              filterMap={filterMap}
              fullWidth
              showTitle={false}
            />
          </PreviewBoundary>
        )}
      </div>
    </section>
  );
};

/**
 * Half-typed YAML can be valid but structurally wrong (a task that is a
 * string, tags that are not a list). The preview must not take the editor
 * down with it, so it recovers on the next edit.
 */
class PreviewBoundary extends React.Component<
  { resetKey: string; children: React.ReactNode },
  { failed: boolean; key: string }
> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: { failed: boolean; key: string }
  ) {
    return props.resetKey !== state.key
      ? { failed: false, key: props.resetKey }
      : null;
  }

  render() {
    return this.state.failed ? (
      <Alert variant="warning" isInline title="Preview unavailable">
        This document cannot be rendered yet. Check that its structure matches a
        learning resource (for example, that each task is a mapping).
      </Alert>
    ) : (
      this.props.children
    );
  }
}

export default ResourcePreview;
