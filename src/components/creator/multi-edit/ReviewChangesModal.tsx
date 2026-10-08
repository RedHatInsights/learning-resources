import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { DiffEditor } from '@monaco-editor/react';
import CodeBranchIcon from '@patternfly/react-icons/dist/dynamic/icons/code-branch-icon';
import { WorkspaceState, defaultPRBody, snapshotChanges } from './workspace';
import { SaveDetails, SaveError } from './useBatchSave';
import { configureMonacoEnvironment } from './monaco';

type ReviewChangesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: SaveDetails) => Promise<boolean>;
  state: WorkspaceState;
  saving: boolean;
  error: SaveError | null;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Shows exactly what the save commits: the real files on disk, not the
 * combined editor buffers, so the author sees both metadata and content diffs.
 */
const ReviewChangesModal: React.FC<ReviewChangesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  state,
  saving,
  error,
}) => {
  const isUpdate = !!state.pr;
  const snapshot = useMemo(
    () => (isOpen ? snapshotChanges(state) : null),
    [isOpen, state]
  );
  const changes = snapshot?.changes ?? [];
  const problems = snapshot?.problems ?? [];
  const resourceNames = [...new Set(changes.map((c) => c.resource))];
  const created = state.resources.filter(
    (r) => r.isNew && resourceNames.includes(r.name)
  ).length;

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  // Prefill each time the dialog opens so the summary matches what is saved.
  useEffect(() => {
    if (!isOpen || !snapshot) return;
    setSelectedPath(snapshot.changes[0]?.path ?? null);
    const names = [...new Set(snapshot.changes.map((c) => c.resource))];
    setPrBody(defaultPRBody(state, names));
    setCommitMessage(
      `docs(quickstarts): update ${plural(names.length, 'learning resource')}`
    );
  }, [isOpen]);

  const selected =
    changes.find((c) => c.path === selectedPath) ?? changes[0] ?? null;
  const canSave =
    changes.length > 0 &&
    problems.length === 0 &&
    commitMessage.trim() !== '' &&
    (isUpdate || prTitle.trim() !== '') &&
    !saving;

  const handleSave = async () => {
    const ok = await onSave({ commitMessage, prTitle, prBody });
    if (ok) onClose();
  };

  const summary = [
    plural(changes.length, 'file'),
    `in ${plural(resourceNames.length, 'resource')}`,
    created ? `(${created} new)` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      variant="large"
      aria-labelledby="mr-review-title"
    >
      <ModalHeader
        title={
          isUpdate ? `Save to PR #${state.pr?.number}` : 'Create pull request'
        }
        labelId="mr-review-title"
        description={
          isUpdate
            ? `${summary} will be added to the pull request as one commit.`
            : `${summary} will be opened as one pull request.`
        }
      />
      <ModalBody>
        {problems.length > 0 && (
          <Alert
            variant="danger"
            isInline
            title="Fix these problems before saving"
            className="pf-v6-u-mb-md"
          >
            <ul>
              {problems.map((p) => (
                <li key={`${p.resource}:${p.message}`}>
                  <strong>{p.resource}</strong>: {p.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {error && (
          <Alert
            variant="danger"
            isInline
            title={
              error.isConflict
                ? 'The pull request changed since it was loaded'
                : 'Save failed'
            }
            className="pf-v6-u-mb-md"
          >
            <span className="lr-c-multi-edit__pre-wrap">{error.message}</span>
            {error.isConflict && (
              <Content component="p">
                Your edits are kept. Copy anything you need, then reopen the PR
                with Continue open PR before saving again.
              </Content>
            )}
          </Alert>
        )}

        {changes.length > 0 && (
          <div className="lr-c-multi-edit-review">
            <ul
              className="lr-c-multi-edit-review__files"
              aria-label="Changed files"
            >
              {resourceNames.map((name) => (
                <li key={name}>
                  <span className="lr-c-multi-edit-review__resource">
                    {name}
                  </span>
                  <ul>
                    {changes
                      .filter((c) => c.resource === name)
                      .map((c) => (
                        <li key={c.path}>
                          <button
                            type="button"
                            className={`lr-c-multi-edit-review__file${
                              c.path === selected?.path ? ' pf-m-current' : ''
                            }`}
                            aria-current={
                              c.path === selected?.path ? 'true' : undefined
                            }
                            onClick={() => setSelectedPath(c.path)}
                          >
                            {c.name}
                            {c.isNew && (
                              <Label
                                color="blue"
                                isCompact
                                className="pf-v6-u-ml-xs"
                              >
                                New
                              </Label>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="lr-c-multi-edit-review__diff">
              {selected && (
                <>
                  <code className="lr-c-multi-edit-review__path">
                    {selected.path}
                  </code>
                  <div className="lr-c-multi-edit-review__diff-editor">
                    <DiffEditor
                      height="100%"
                      language="yaml"
                      original={selected.before}
                      modified={selected.after}
                      originalModelPath={`review-original://${selected.path}`}
                      modifiedModelPath={`review-modified://${selected.path}`}
                      beforeMount={configureMonacoEnvironment}
                      options={{
                        readOnly: true,
                        renderSideBySide: !selected.isNew,
                        automaticLayout: true,
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Form className="pf-v6-u-mt-md">
          {!isUpdate && (
            <>
              <FormGroup
                label="Pull request title"
                isRequired
                fieldId="mr-pr-title"
              >
                <TextInput
                  id="mr-pr-title"
                  isRequired
                  value={prTitle}
                  placeholder="e.g. Update Inventory documentation URLs"
                  onChange={(_e, value) => setPrTitle(value)}
                />
              </FormGroup>
              <FormGroup label="Pull request description" fieldId="mr-pr-body">
                <TextArea
                  id="mr-pr-body"
                  value={prBody}
                  rows={4}
                  resizeOrientation="vertical"
                  onChange={(_e, value) => setPrBody(value)}
                />
              </FormGroup>
            </>
          )}
          <FormGroup
            label="Commit message"
            isRequired
            fieldId="mr-commit-message"
          >
            <TextInput
              id="mr-commit-message"
              isRequired
              value={commitMessage}
              onChange={(_e, value) => setCommitMessage(value)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          icon={<CodeBranchIcon />}
          onClick={handleSave}
          isDisabled={!canSave}
          isLoading={saving}
        >
          {isUpdate ? `Save to PR #${state.pr?.number}` : 'Create pull request'}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={saving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ReviewChangesModal;
