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
import CodeBranchIcon from '@patternfly/react-icons/dist/dynamic/icons/code-branch-icon';
import {
  DeletedResource,
  FileChange,
  WorkspaceResource,
  WorkspaceState,
  defaultPRBody,
  resourceTitle,
  snapshotChanges,
} from './workspace';
import { SaveDetails, SaveError } from './useBatchSave';
import UnifiedDiff from './UnifiedDiff';

type ReviewChangesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: SaveDetails) => Promise<boolean>;
  state: WorkspaceState;
  saving: boolean;
  error: SaveError | null;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Selection in the file list: a changed file, or a resource being removed. */
type Selected = { path: string } | { removal: string };

/** A file the save writes, deletes or brings back, with its diff. */
type ReviewFile = FileChange & { status?: 'deleted' | 'restored' };

/** Every file of a deleted or restored resource, as the diff shows it. */
const filesOf = (
  resources: DeletedResource[],
  status: 'deleted' | 'restored'
): ReviewFile[] =>
  resources.flatMap((d) =>
    d.files.map((f) => ({
      resource: d.name,
      path: `${d.path}/${f.name}`,
      name: f.name,
      before: status === 'deleted' ? f.saved : '',
      after: status === 'deleted' ? '' : f.saved,
      isNew: false,
      status,
    }))
  );

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
  const reverted = snapshot?.reverted ?? [];
  const renamed = snapshot?.renamed ?? [];
  const deleted = snapshot?.deleted ?? [];
  const restored = snapshot?.restored ?? [];
  const problems = snapshot?.problems ?? [];
  const files: ReviewFile[] = [
    ...changes,
    ...filesOf(deleted, 'deleted'),
    ...filesOf(restored, 'restored'),
  ];
  const resourceNames = [...new Set(changes.map((c) => c.resource))];
  const resourceByName = new Map(state.resources.map((r) => [r.name, r]));
  const created = state.resources.filter(
    (r) => r.isNew && resourceNames.includes(r.name)
  ).length;

  const [selection, setSelection] = useState<Selected | null>(null);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  // Prefill each time the dialog opens so the summary matches what is saved.
  useEffect(() => {
    if (!isOpen || !snapshot) return;
    const first =
      snapshot.changes[0] ??
      filesOf(snapshot.deleted, 'deleted')[0] ??
      filesOf(snapshot.restored, 'restored')[0];
    setSelection(
      first
        ? { path: first.path }
        : snapshot.reverted[0]
        ? { removal: snapshot.reverted[0].name }
        : null
    );
    const names = [...new Set(snapshot.changes.map((c) => c.resource))];
    setPrBody(defaultPRBody(state, names));
    setCommitMessage(
      defaultCommitMessage(
        names,
        snapshot.renamed,
        snapshot.reverted,
        snapshot.deleted,
        snapshot.restored
      )
    );
  }, [isOpen]);

  const selectedRemoval =
    selection && 'removal' in selection
      ? reverted.find((r) => r.name === selection.removal) ?? null
      : null;
  const selected = selectedRemoval
    ? null
    : files.find(
        (c) => selection && 'path' in selection && c.path === selection.path
      ) ??
      files[0] ??
      null;
  const hasWork =
    changes.length > 0 ||
    reverted.length > 0 ||
    deleted.length > 0 ||
    restored.length > 0;
  const canSave =
    hasWork &&
    problems.length === 0 &&
    commitMessage.trim() !== '' &&
    (isUpdate || prTitle.trim() !== '') &&
    !saving;

  const handleSave = async () => {
    const ok = await onSave({ commitMessage, prTitle, prBody });
    if (ok) onClose();
  };

  const summary = [
    changes.length > 0 &&
      [
        plural(changes.length, 'file'),
        `in ${plural(resourceNames.length, 'resource')}`,
        created ? `(${created} new)` : '',
      ]
        .filter(Boolean)
        .join(' '),
    reverted.length > 0 &&
      `${plural(reverted.length, 'resource')} removed from the PR`,
    deleted.length > 0 && `${plural(deleted.length, 'resource')} deleted`,
    restored.length > 0 && `${plural(restored.length, 'resource')} restored`,
  ]
    .filter(Boolean)
    .join(' and ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      variant="large"
      aria-labelledby="mr-review-title"
      // Modals render outside the app root, where its scoped styles stop.
      className="learning-resources"
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

        {hasWork && (
          <div className="lr-c-multi-edit-review">
            <ul
              className="lr-c-multi-edit-review__files"
              aria-label="Changed files"
            >
              {resourceNames.map((name) => {
                const resource = resourceByName.get(name);
                const title = resource ? resourceTitle(resource) : name;
                const renamedTo = renamed.find((r) => r.from === name)?.to;
                return (
                  <li key={name}>
                    <span className="lr-c-multi-edit-review__resource">
                      {title}
                      {resource?.isNew && (
                        <Label color="blue" isCompact>
                          New
                        </Label>
                      )}
                      {renamedTo && (
                        <Label color="purple" isCompact>
                          Renamed
                        </Label>
                      )}
                    </span>
                    {renamedTo && (
                      <span className="lr-c-multi-edit-review__subtle lr-c-multi-edit-review__move">
                        {name} → {renamedTo}
                      </span>
                    )}
                    <ul>
                      {changes
                        .filter((c) => c.resource === name)
                        .map((c) => (
                          <li key={c.path}>
                            <FileButton
                              isCurrent={c.path === selected?.path}
                              title={c.path}
                              onClick={() => setSelection({ path: c.path })}
                            >
                              {c.name}
                            </FileButton>
                          </li>
                        ))}
                    </ul>
                  </li>
                );
              })}
              {(
                [
                  ['Deleted', deleted, 'deleted'],
                  ['Restored', restored, 'restored'],
                ] as const
              ).map(
                ([heading, list, status]) =>
                  list.length > 0 && (
                    <li key={status}>
                      <span className="lr-c-multi-edit-review__resource">
                        {heading}
                      </span>
                      {list.map((d) => (
                        <React.Fragment key={d.name}>
                          <span className="lr-c-multi-edit-review__subtle lr-c-multi-edit-review__move">
                            {d.title} · {d.name}
                          </span>
                          <ul>
                            {filesOf([d], status).map((f) => (
                              <li key={f.path}>
                                <FileButton
                                  isCurrent={f.path === selected?.path}
                                  title={f.path}
                                  onClick={() => setSelection({ path: f.path })}
                                >
                                  {f.name}
                                </FileButton>
                              </li>
                            ))}
                          </ul>
                        </React.Fragment>
                      ))}
                    </li>
                  )
              )}
              {reverted.length > 0 && (
                <li>
                  <span className="lr-c-multi-edit-review__resource">
                    Changes removed from PR
                  </span>
                  <ul>
                    {reverted.map((r) => (
                      <li key={r.name}>
                        <FileButton
                          isCurrent={selectedRemoval === r}
                          title={`${r.path}/`}
                          onClick={() => setSelection({ removal: r.name })}
                        >
                          {resourceTitle(r)}
                        </FileButton>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
            <div className="lr-c-multi-edit-review__diff">
              {selected && (
                <>
                  <div
                    className="lr-c-multi-edit-review__diff-header"
                    title={selected.path}
                  >
                    <strong>{selected.name}</strong>
                    <span className="lr-c-multi-edit-review__subtle">
                      {selected.status === 'deleted'
                        ? 'deleted when the PR merges'
                        : selected.status === 'restored'
                        ? 'restored as it was before this PR'
                        : selected.isNew
                        ? 'new file'
                        : selected.previousPath
                        ? `moved from ${selected.previousPath}`
                        : 'changes'}
                    </span>
                  </div>
                  <div className="lr-c-multi-edit-review__diff-editor">
                    <UnifiedDiff
                      key={selected.path}
                      before={selected.before}
                      after={selected.after}
                    />
                  </div>
                </>
              )}
              {selectedRemoval && <RemovalSummary resource={selectedRemoval} />}
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

const FileButton: React.FC<{
  isCurrent: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ isCurrent, title, onClick, children }) => (
  <button
    type="button"
    className={`lr-c-multi-edit-review__file${
      isCurrent ? ' pf-m-current' : ''
    }`}
    aria-current={isCurrent ? 'true' : undefined}
    title={title}
    onClick={onClick}
  >
    {children}
  </button>
);

const RemovalSummary: React.FC<{ resource: WorkspaceResource }> = ({
  resource,
}) => (
  <div className="lr-c-multi-edit-review__removal">
    <Content component="p">
      This pull request&apos;s changes to{' '}
      <strong>{resourceTitle(resource)}</strong> are removed. Its files in{' '}
      <code>{resource.path}/</code> go back to how they were before this PR, or
      the directory goes away if this PR added it.
    </Content>
    <Content component="small">
      This is not a deletion of a published resource; nothing outside this pull
      request changes.
    </Content>
  </div>
);

const nameOrCount = (list: { name: string }[]) =>
  list.length === 1 ? list[0].name : plural(list.length, 'resource');

function defaultCommitMessage(
  names: string[],
  renamed: { from: string; to: string }[],
  reverted: WorkspaceResource[],
  deleted: DeletedResource[],
  restored: DeletedResource[]
) {
  const edited = names.filter((n) => !renamed.some((r) => r.from === n)).length;
  const parts = [
    edited > 0 && `update ${plural(edited, 'learning resource')}`,
    renamed.length > 0 &&
      (renamed.length === 1
        ? `rename ${renamed[0].from} to ${renamed[0].to}`
        : `rename ${plural(renamed.length, 'resource')}`),
    reverted.length > 0 &&
      `remove ${
        reverted.length === 1
          ? reverted[0].name
          : plural(reverted.length, 'resource')
      } from this PR`,
    deleted.length > 0 && `delete ${nameOrCount(deleted)}`,
    restored.length > 0 && `restore ${nameOrCount(restored)}`,
  ].filter(Boolean);
  return `docs(quickstarts): ${parts.join(', ')}`;
}

export default ReviewChangesModal;
