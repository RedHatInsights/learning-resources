import React, { Dispatch, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertActionLink,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Label,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import Editor, { OnMount } from '@monaco-editor/react';
import CodeIcon from '@patternfly/react-icons/dist/dynamic/icons/code-icon';
import ColumnsIcon from '@patternfly/react-icons/dist/dynamic/icons/columns-icon';
import EyeIcon from '@patternfly/react-icons/dist/dynamic/icons/eye-icon';
import PlusCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/plus-circle-icon';
import ListIcon from '@patternfly/react-icons/dist/dynamic/icons/list-icon';
import CubesIcon from '@patternfly/react-icons/dist/dynamic/icons/cubes-icon';
import { detectKindFromSpec } from '../hydrateFromFiles';
import { metaForKind } from '../meta';
import { FilterMap } from '../../../utils/filtersInterface';
import {
  WorkspaceAction,
  WorkspaceState,
  dirtyResources,
  isDirty,
  isInPR,
  pendingCount,
  previewForResource,
  renameTarget,
  resourceTitle,
  yamlError,
} from './workspace';
import { useBatchSave } from './useBatchSave';
import ResourceSidebar from './ResourceSidebar';
import ResourcePreview from './ResourcePreview';
import ResourcePickerModal from './ResourcePickerModal';
import NewResourceModal from './NewResourceModal';
import OpenPRModal from './OpenPRModal';
import ReviewChangesModal from './ReviewChangesModal';
import RemoveResourcesModal from './RemoveResourcesModal';
import { configureMonacoEnvironment } from './monaco';
import './MultiEditWorkspace.scss';

type View = 'editor' | 'split' | 'preview';
const VIEW_STORAGE_KEY = 'lr-creator-multi-edit-view';

/** Split by default only where both panes get a usable width. */
function initialView(): View {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'editor' || stored === 'split' || stored === 'preview') {
      return stored;
    }
  } catch {
    // Storage can be unavailable; fall back to the width-based default.
  }
  return window.innerWidth >= 1280 ? 'split' : 'editor';
}

type MultiEditWorkspaceProps = {
  filterMap: FilterMap;
  /** Owned by the Creator page so switching modes never drops the work. */
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

const MultiEditWorkspace = ({
  filterMap,
  state,
  dispatch,
}: MultiEditWorkspaceProps) => {
  const { save, saving, error, clearError } = useBatchSave(state, dispatch);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isNewOpen, setNewOpen] = useState(false);
  const [isOpenPROpen, setOpenPROpen] = useState(false);
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [view, setViewState] = useState<View>(initialView);
  // Per resource, so the preview reopens where the author left it.
  const [previewStages, setPreviewStages] = useState<Record<string, string>>(
    {}
  );

  const setView = (next: View) => {
    setViewState(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Only a convenience.
    }
  };

  const changed = dirtyResources(state);
  const pending = pendingCount(state);
  const active =
    state.resources.find((r) => r.name === state.activeName) ?? null;
  const activeTarget = active && renameTarget(active);
  const activeMovesTo =
    activeTarget && activeTarget !== active?.name ? activeTarget : null;
  const activeError = useMemo(
    () => (active ? yamlError(active.buffer) : null),
    [active?.buffer]
  );
  const activeKind = useMemo(() => {
    const preview = active ? previewForResource(active) : null;
    const kind = preview?.quickStart
      ? detectKindFromSpec(
          preview.quickStart.spec as unknown as Record<string, unknown>
        )
      : null;
    return kind ? metaForKind(kind) : null;
  }, [active?.buffer]);

  // Unsaved edits live only in this tab, so leaving would lose them.
  useEffect(() => {
    if (pending === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending > 0]);

  const openReview = () => {
    if (pending === 0 || saving) return;
    clearError();
    setReviewOpen(true);
  };
  // Monaco binds the shortcut once; the ref keeps it pointing at fresh state.
  const openReviewRef = useRef(openReview);
  openReviewRef.current = openReview;
  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
      openReviewRef.current()
    );
  };

  const handleSave = async (details: Parameters<typeof save>[0]) => {
    const ok = await save(details);
    if (ok) setSavedAt(new Date());
    return ok;
  };

  /**
   * Removing a clean resource is free. Unsaved work is confirmed, and so is
   * anything the PR changes, since the author may mean to take it out.
   */
  const requestRemove = (names: string[]) => {
    const risky = state.resources.filter(
      (r) =>
        names.includes(r.name) &&
        (isDirty(r) || (state.pr && isInPR(state, r.name)))
    );
    if (risky.length === 0) dispatch({ type: 'removeResources', names });
    else setPendingRemoval(names);
  };

  const prStatus = state.pr ? (
    <a href={state.pr.url} target="_blank" rel="noopener noreferrer">
      PR #{state.pr.number}
    </a>
  ) : (
    <span>Not saved to a pull request yet</span>
  );

  return (
    <div className="lr-c-multi-edit">
      <div className="lr-c-multi-edit__toolbar">
        <div className="lr-c-multi-edit__summary">
          <Title headingLevel="h2" size="lg">
            {state.resources.length === 0
              ? 'Batch editor'
              : `${state.resources.length} ${
                  state.resources.length === 1 ? 'resource' : 'resources'
                }`}
          </Title>
          <span className="lr-c-multi-edit__status">
            {prStatus}
            <span aria-hidden="true"> · </span>
            {pending === 0
              ? savedAt && state.pr
                ? `All changes saved at ${savedAt.toLocaleTimeString()}`
                : 'No unsaved changes'
              : `${pending} unsaved`}
          </span>
        </div>
        <div className="lr-c-multi-edit__actions">
          <Button
            variant="secondary"
            icon={<ListIcon />}
            onClick={() => setPickerOpen(true)}
          >
            Choose resources
          </Button>
          <Button
            variant="secondary"
            icon={<PlusCircleIcon />}
            onClick={() => setNewOpen(true)}
          >
            New resource
          </Button>
          <Button variant="link" onClick={() => setOpenPROpen(true)}>
            Continue open PR
          </Button>
          <Tooltip content="Review and save (Ctrl/⌘ + S in the editor)">
            <Button
              variant="primary"
              onClick={openReview}
              isAriaDisabled={pending === 0 || saving}
              isLoading={saving}
            >
              {state.pr ? `Save to PR #${state.pr.number}` : 'Create PR'}
              {pending > 0 && (
                <Badge isRead className="pf-v6-u-ml-sm">
                  {pending}
                </Badge>
              )}
            </Button>
          </Tooltip>
        </div>
      </div>

      {state.missing.length > 0 && (
        <Alert
          variant="info"
          isInline
          isPlain
          title="Some directories in this PR no longer exist on its branch"
          className="pf-v6-u-mb-sm"
        >
          {state.missing.join(', ')}. They were renamed or removed in the PR and
          are not editable here.
        </Alert>
      )}

      {error && !isReviewOpen && (
        <Alert
          variant="danger"
          isInline
          title={
            error.isConflict
              ? 'The pull request changed since it was loaded'
              : 'Save failed'
          }
          actionLinks={
            <AlertActionLink onClick={openReview}>
              Review changes
            </AlertActionLink>
          }
          className="pf-v6-u-mb-sm"
        >
          {error.message}
        </Alert>
      )}

      {state.resources.length === 0 && state.removals.length === 0 ? (
        <EmptyState
          titleText="Edit several learning resources in one pull request"
          headingLevel="h3"
          icon={CubesIcon}
          className="lr-c-multi-edit__empty"
        >
          <EmptyStateBody>
            Pick existing resources from the repository, create new ones, or
            both. Every change is saved together to a single PR that you can
            keep adding to.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={() => setPickerOpen(true)}>
                Choose resources
              </Button>
              <Button variant="secondary" onClick={() => setNewOpen(true)}>
                New resource
              </Button>
            </EmptyStateActions>
            <EmptyStateActions>
              <Button variant="link" onClick={() => setOpenPROpen(true)}>
                Continue an open PR
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <div className="lr-c-multi-edit__body">
          <ResourceSidebar
            resources={state.resources}
            activeName={state.activeName}
            onSelect={(name) => dispatch({ type: 'setActive', name })}
            onRemove={(name) => requestRemove([name])}
            removals={state.removals}
            onUndoRemoval={(name) => dispatch({ type: 'undoRemoval', name })}
          />

          {!active && (
            <EmptyState
              titleText="No resources open"
              headingLevel="h3"
              className="lr-c-multi-edit__empty"
            >
              <EmptyStateBody>
                Save to take the removed resources out of the PR, or choose
                resources to keep editing.
              </EmptyStateBody>
            </EmptyState>
          )}

          {active && (
            <section
              className="lr-c-multi-edit__stage"
              aria-label={resourceTitle(active)}
            >
              <div className="lr-c-multi-edit__stage-header">
                <div className="lr-c-multi-edit__stage-title">
                  <Title headingLevel="h3" size="lg">
                    {resourceTitle(active)}
                  </Title>
                  {activeKind && (
                    <Label color={activeKind.tagColor} isCompact>
                      {activeKind.displayName}
                    </Label>
                  )}
                  {active.isNew ? (
                    <Label color="blue" isCompact>
                      New
                    </Label>
                  ) : (
                    isDirty(active) && (
                      <Label color="orange" isCompact>
                        Unsaved
                      </Label>
                    )
                  )}
                  <code className="lr-c-multi-edit__path">
                    {active.path}/{activeMovesTo && ` → ${activeMovesTo}/`}
                  </code>
                </div>
                <div className="lr-c-multi-edit__stage-actions">
                  <Button
                    variant="link"
                    isInline
                    isDisabled={active.buffer === active.baseline}
                    onClick={() =>
                      dispatch({ type: 'discard', name: active.name })
                    }
                  >
                    Discard changes
                  </Button>
                  <ToggleGroup aria-label="Layout" isCompact>
                    <ToggleGroupItem
                      icon={<CodeIcon />}
                      text="Editor"
                      buttonId="mr-view-editor"
                      isSelected={view === 'editor'}
                      onChange={() => setView('editor')}
                    />
                    <ToggleGroupItem
                      icon={<ColumnsIcon />}
                      text="Split"
                      buttonId="mr-view-split"
                      isSelected={view === 'split'}
                      onChange={() => setView('split')}
                    />
                    <ToggleGroupItem
                      icon={<EyeIcon />}
                      text="Preview"
                      buttonId="mr-view-preview"
                      isSelected={view === 'preview'}
                      onChange={() => setView('preview')}
                    />
                  </ToggleGroup>
                </div>
              </div>

              <div className={`lr-c-multi-edit__panes pf-m-${view}`}>
                {/* Hidden rather than unmounted, so undo history survives. */}
                <div className="lr-c-multi-edit__editor-pane">
                  {active.layout !== 'combined' && (
                    <Alert
                      variant="info"
                      isInline
                      isPlain
                      title={`Editing ${
                        (active.layout === 'content'
                          ? active.content
                          : active.metadata
                        )?.name
                      } on its own`}
                      className="pf-v6-u-mb-sm"
                    >
                      {active.metadataSkipped === 'tags-differ'
                        ? `This file and ${active.metadata?.name} list different tags, so only this file is edited here and ${active.metadata?.name} is left untouched. Make the two tag lists match to edit them together.`
                        : active.metadataSkipped === 'unmergeable'
                        ? `${active.metadata?.name} could not be merged into this view, so it is left untouched.`
                        : active.layout === 'metadata'
                        ? 'This resource has no content file.'
                        : 'This resource has no metadata file.'}
                    </Alert>
                  )}
                  {activeError && (
                    <Alert
                      variant="danger"
                      isInline
                      isPlain
                      title={`YAML problem: ${activeError}`}
                      className="pf-v6-u-mb-sm"
                    />
                  )}
                  <div className="lr-c-multi-edit__editor">
                    <Editor
                      height="100%"
                      language="yaml"
                      theme="vs"
                      // A model per resource keeps undo, cursor and scroll.
                      path={`${active.path}/combined.yaml`}
                      value={active.buffer}
                      onChange={(value) =>
                        dispatch({
                          type: 'edit',
                          name: active.name,
                          buffer: value ?? '',
                        })
                      }
                      beforeMount={configureMonacoEnvironment}
                      onMount={handleEditorMount}
                      options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        fontSize: 14,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>
                {view !== 'editor' && (
                  <ResourcePreview
                    resource={active}
                    filterMap={filterMap}
                    stageKey={previewStages[active.name] ?? 'card'}
                    onStageKeyChange={(key) =>
                      setPreviewStages((stages) => ({
                        ...stages,
                        [active.name]: key,
                      }))
                    }
                  />
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <ResourcePickerModal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(resources, baseSha) =>
          dispatch({ type: 'addResources', resources, baseSha })
        }
        onRemove={requestRemove}
        pr={state.pr}
        existing={state.resources.map((r) => r.name)}
        edited={changed.map((r) => r.name)}
      />
      <NewResourceModal
        isOpen={isNewOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(name, buffer) =>
          dispatch({ type: 'createResource', name, buffer })
        }
        taken={state.resources.flatMap((r) => {
          const target = renameTarget(r);
          return target ? [r.name, target] : [r.name];
        })}
      />
      <OpenPRModal
        isOpen={isOpenPROpen}
        onClose={() => setOpenPROpen(false)}
        onLoad={(workspace) => {
          clearError();
          setSavedAt(null);
          dispatch({ type: 'loadPR', workspace });
        }}
        unsavedCount={pending}
      />
      <ReviewChangesModal
        isOpen={isReviewOpen}
        onClose={() => setReviewOpen(false)}
        onSave={handleSave}
        state={state}
        saving={saving}
        error={error}
      />
      <RemoveResourcesModal
        resources={state.resources.filter((r) =>
          pendingRemoval.includes(r.name)
        )}
        pr={state.pr}
        inPR={state.prResources}
        onRemoveFromPR={() => {
          dispatch({ type: 'removeFromPR', names: pendingRemoval });
          setPendingRemoval([]);
        }}
        onClose={() => {
          dispatch({ type: 'removeResources', names: pendingRemoval });
          setPendingRemoval([]);
        }}
        onCancel={() => setPendingRemoval([])}
      />
      <span className="pf-v6-screen-reader" aria-live="polite">
        {saving ? 'Saving changes' : ''}
      </span>
    </div>
  );
};

export default MultiEditWorkspace;
