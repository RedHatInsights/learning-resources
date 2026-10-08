import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  Alert,
  AlertActionLink,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  SimpleList,
  SimpleListGroup,
  SimpleListItem,
  Title,
} from '@patternfly/react-core';
import Editor from '@monaco-editor/react';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/exclamation-circle-icon';
import CreatorPreview from '../CreatorPreview';
import { detectKindFromSpec } from '../hydrateFromFiles';
import { metaForKind } from '../meta';
import { FilterMap } from '../../../utils/filtersInterface';
import {
  dirtyFiles,
  emptyWorkspace,
  isDirty,
  previewForResource,
  workspaceReducer,
  yamlError,
} from './workspace';
import { useBatchSave } from './useBatchSave';
import ResourcePickerModal from './ResourcePickerModal';
import OpenPRModal from './OpenPRModal';
import ReviewChangesModal from './ReviewChangesModal';
import { configureMonacoEnvironment } from './monaco';
import './MultiEditWorkspace.scss';

const CARD_STAGE = { type: 'card' } as const;

const MultiEditWorkspace = ({ filterMap }: { filterMap: FilterMap }) => {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    undefined,
    emptyWorkspace
  );
  const { save, saving, error, clearError } = useBatchSave(state, dispatch);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isOpenPROpen, setOpenPROpen] = useState(false);
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const changed = dirtyFiles(state);
  const activeFile = state.activePath ? state.files[state.activePath] : null;
  const activeError = activeFile ? yamlError(activeFile.content) : null;

  const preview = useMemo(
    () => (activeFile ? previewForResource(state, activeFile.resource) : null),
    [state.files, state.resources, activeFile?.resource]
  );
  const previewKind = preview?.quickStart
    ? detectKindFromSpec(
        preview.quickStart.spec as unknown as Record<string, unknown>
      )
    : null;

  // Unsaved edits live only in this tab, so leaving would lose them.
  useEffect(() => {
    if (changed.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length > 0]);

  const handleSave = async (details: Parameters<typeof save>[0]) => {
    const ok = await save(details);
    if (ok) setSavedAt(new Date());
    return ok;
  };

  const saveLabel = state.pr
    ? `Save changes to PR #${state.pr.number}`
    : 'Create PR';

  return (
    <div className="lr-c-multi-edit">
      <Flex
        className="lr-c-multi-edit__header"
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Title headingLevel="h2" size="lg">
            Editing {state.resources.length}{' '}
            {state.resources.length === 1 ? 'resource' : 'resources'}
          </Title>
          <span className="lr-c-multi-edit__status">
            {state.pr ? (
              <a href={state.pr.url} target="_blank" rel="noopener noreferrer">
                PR #{state.pr.number}
              </a>
            ) : (
              'Not saved to a PR yet'
            )}
            {' · '}
            {changed.length === 0
              ? 'No unsaved changes'
              : `${changed.length} ${
                  changed.length === 1 ? 'file has' : 'files have'
                } unsaved changes`}
            {savedAt &&
              state.pr &&
              ` · Last saved to PR #${
                state.pr.number
              } at ${savedAt.toLocaleTimeString()}`}
          </span>
        </FlexItem>
        <FlexItem>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              Add resources
            </Button>
            <Button variant="secondary" onClick={() => setOpenPROpen(true)}>
              Continue open PR
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                clearError();
                setReviewOpen(true);
              }}
              isDisabled={changed.length === 0 || saving}
            >
              Review changes
            </Button>
          </Flex>
        </FlexItem>
      </Flex>

      {state.missing.length > 0 && (
        <Alert
          variant="info"
          isInline
          title="Some directories in this PR no longer exist on its branch"
          className="pf-v6-u-mb-md"
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
            <AlertActionLink onClick={() => setReviewOpen(true)}>
              Review changes
            </AlertActionLink>
          }
          className="pf-v6-u-mb-md"
        >
          {error.message}
        </Alert>
      )}

      {state.resources.length === 0 ? (
        <EmptyState titleText="No resources yet" headingLevel="h3">
          <EmptyStateBody>
            Add existing learning resources from the repository, or continue a
            pull request you already started. All changes are saved to one PR.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" onClick={() => setPickerOpen(true)}>
                Add resources
              </Button>
              <Button variant="link" onClick={() => setOpenPROpen(true)}>
                Continue open PR
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <Grid hasGutter>
          <GridItem span={12} lg={3}>
            <SimpleList
              aria-label="Workspace files"
              className="lr-c-multi-edit__files"
              onSelect={(_ref, props) =>
                dispatch({ type: 'setActive', path: String(props.itemId) })
              }
            >
              {state.resources.map((resource) => (
                <SimpleListGroup
                  key={resource.name}
                  title={resource.name}
                  titleClassName="lr-c-multi-edit__resource-title"
                >
                  {resource.filePaths.map((path) => {
                    const file = state.files[path];
                    const invalid =
                      isDirty(file) && yamlError(file.content) !== null;
                    return (
                      <SimpleListItem
                        key={path}
                        itemId={path}
                        isActive={path === state.activePath}
                      >
                        {isDirty(file) && (
                          <span
                            className="lr-c-multi-edit__dirty"
                            aria-label="Unsaved changes"
                          >
                            *{' '}
                          </span>
                        )}
                        {file.name}
                        {invalid && (
                          <ExclamationCircleIcon
                            className="lr-c-multi-edit__invalid pf-v6-u-ml-xs"
                            aria-label="Invalid YAML"
                          />
                        )}
                      </SimpleListItem>
                    );
                  })}
                </SimpleListGroup>
              ))}
            </SimpleList>
          </GridItem>

          <GridItem span={12} lg={5}>
            {activeFile && (
              <>
                <Flex
                  className="lr-c-multi-edit__editor-header"
                  alignItems={{ default: 'alignItemsCenter' }}
                  justifyContent={{ default: 'justifyContentSpaceBetween' }}
                >
                  <FlexItem>
                    <code>{activeFile.path}</code>
                    {isDirty(activeFile) && (
                      <Label color="orange" isCompact className="pf-v6-u-ml-sm">
                        Unsaved
                      </Label>
                    )}
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="link"
                      isInline
                      isDisabled={!isDirty(activeFile)}
                      onClick={() =>
                        dispatch({ type: 'discard', paths: [activeFile.path] })
                      }
                    >
                      Discard unsaved changes
                    </Button>
                  </FlexItem>
                </Flex>
                {activeError && (
                  <Alert
                    variant="danger"
                    isInline
                    isPlain
                    title={`Invalid YAML: ${activeError}`}
                    className="pf-v6-u-mb-sm"
                  />
                )}
                <div className="lr-c-multi-edit__editor">
                  <Editor
                    height="100%"
                    language="yaml"
                    theme="vs"
                    // A model per path keeps undo, cursor and scroll per file.
                    path={activeFile.path}
                    value={activeFile.content}
                    onChange={(value) =>
                      dispatch({
                        type: 'edit',
                        path: activeFile.path,
                        content: value ?? '',
                      })
                    }
                    beforeMount={configureMonacoEnvironment}
                    options={{
                      automaticLayout: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      fontSize: 14,
                    }}
                  />
                </div>
              </>
            )}
          </GridItem>

          <GridItem span={12} lg={4}>
            {preview?.error ? (
              <Alert variant="warning" isInline title="Preview unavailable">
                {preview.error}
              </Alert>
            ) : preview?.quickStart ? (
              <CreatorPreview
                kindMeta={previewKind ? metaForKind(previewKind) : null}
                quickStart={preview.quickStart}
                currentStage={CARD_STAGE}
                filterMap={filterMap}
              />
            ) : null}
          </GridItem>
        </Grid>
      )}

      <ResourcePickerModal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(resources, baseSha) =>
          dispatch({ type: 'addResources', resources, baseSha })
        }
        pr={state.pr}
        existing={state.resources.map((r) => r.name)}
      />
      <OpenPRModal
        isOpen={isOpenPROpen}
        onClose={() => setOpenPROpen(false)}
        onLoad={(workspace) => {
          clearError();
          setSavedAt(null);
          dispatch({ type: 'loadPR', workspace });
        }}
        unsavedCount={changed.length}
      />
      <ReviewChangesModal
        isOpen={isReviewOpen}
        onClose={() => setReviewOpen(false)}
        onSave={handleSave}
        state={state}
        changed={changed}
        saving={saving}
        error={error}
      />
      <span className="pf-v6-screen-reader" aria-live="polite">
        {saving ? `Saving: ${saveLabel}` : ''}
      </span>
    </div>
  );
};

export default MultiEditWorkspace;
