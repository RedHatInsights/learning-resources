import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SimpleList,
  SimpleListItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { DiffEditor } from '@monaco-editor/react';
import CodeBranchIcon from '@patternfly/react-icons/dist/dynamic/icons/code-branch-icon';
import { WorkspaceFile, WorkspaceState, defaultPRBody } from './workspace';
import { SaveDetails, SaveError } from './useBatchSave';
import { configureMonacoEnvironment } from './monaco';

type ReviewChangesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: SaveDetails) => Promise<boolean>;
  state: WorkspaceState;
  changed: WorkspaceFile[];
  saving: boolean;
  error: SaveError | null;
};

const ReviewChangesModal: React.FC<ReviewChangesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  state,
  changed,
  saving,
  error,
}) => {
  const isUpdate = !!state.pr;
  const changedResources = [...new Set(changed.map((f) => f.resource))];

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  // Prefill each time the dialog opens so the summary matches what is saved.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPath(changed[0]?.path ?? null);
    setPrBody(defaultPRBody(state, changedResources));
    setCommitMessage(
      `docs(quickstarts): update ${changedResources.length} learning resource${
        changedResources.length === 1 ? '' : 's'
      }`
    );
  }, [isOpen]);

  const selected = changed.find((f) => f.path === selectedPath) ?? changed[0];
  const canSave =
    changed.length > 0 &&
    commitMessage.trim() !== '' &&
    (isUpdate || prTitle.trim() !== '') &&
    !saving;

  const handleSave = async () => {
    const ok = await onSave({ commitMessage, prTitle, prBody });
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      variant="large"
      aria-label="Review changes"
    >
      <ModalHeader
        title="Review changes"
        description={`${changed.length} ${
          changed.length === 1 ? 'file' : 'files'
        } in ${changedResources.length} ${
          changedResources.length === 1 ? 'resource' : 'resources'
        }`}
      />
      <ModalBody>
        {error && (
          <Alert
            variant="danger"
            isInline
            title={
              error.isConflict
                ? 'The pull request changed since it was loaded'
                : error.invalidPaths
                ? 'Fix invalid YAML before saving'
                : 'Save failed'
            }
            className="pf-v6-u-mb-md"
          >
            <span style={{ whiteSpace: 'pre-wrap' }}>{error.message}</span>
            {error.isConflict && (
              <Content component="p">
                Your edits are kept. Copy anything you need, then reopen the PR
                with Continue open PR before saving again.
              </Content>
            )}
          </Alert>
        )}

        <div className="lr-c-multi-edit-review">
          <SimpleList
            aria-label="Changed files"
            className="lr-c-multi-edit-review__files"
            onSelect={(_ref, props) => setSelectedPath(String(props.itemId))}
          >
            {changed.map((f) => (
              <SimpleListItem
                key={f.path}
                itemId={f.path}
                isActive={f.path === selected?.path}
              >
                <code>{f.path}</code>
              </SimpleListItem>
            ))}
          </SimpleList>
          <div className="lr-c-multi-edit-review__diff">
            {selected && (
              <DiffEditor
                height="100%"
                language="yaml"
                original={selected.saved}
                modified={selected.content}
                originalModelPath={`review-original://${selected.path}`}
                modifiedModelPath={`review-modified://${selected.path}`}
                beforeMount={configureMonacoEnvironment}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  automaticLayout: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                }}
              />
            )}
          </div>
        </div>

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
                  rows={5}
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
          {isUpdate ? `Save changes to PR #${state.pr?.number}` : 'Create PR'}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={saving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ReviewChangesModal;
