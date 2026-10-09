import React from 'react';
import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import {
  WorkspacePR,
  WorkspaceResource,
  isDirty,
  resourceTitle,
} from './workspace';

type RemoveResourcesModalProps = {
  /** The resources to remove; the dialog is open while this is non-empty. */
  resources: WorkspaceResource[];
  pr: WorkspacePR | null;
  /** Names of the resources the PR changes. */
  inPR: string[];
  /** Close the resources and revert the ones in the PR on the next save. */
  onRemoveFromPR: () => void;
  /** Only close the resources here; the PR keeps whatever it has. */
  onClose: () => void;
  onCancel: () => void;
};

const names = (resources: WorkspaceResource[]) =>
  resources.map(resourceTitle).join(', ');

/**
 * Confirms removing resources that have unsaved work or that the PR changes.
 * For the latter the author chooses: take them out of the PR (applied on the
 * next save, so it can still be undone), or only stop editing them here.
 */
const RemoveResourcesModal: React.FC<RemoveResourcesModalProps> = ({
  resources,
  pr,
  inPR,
  onRemoveFromPR,
  onClose,
  onCancel,
}) => {
  const fromPR = pr ? resources.filter((r) => inPR.includes(r.name)) : [];
  const lost = resources.filter((r) => isDirty(r) && !inPR.includes(r.name));
  const created = lost.filter((r) => r.isNew);
  const edited = lost.filter((r) => !r.isNew);
  const count = resources.length;

  return (
    <Modal
      isOpen={count > 0}
      onClose={onCancel}
      variant="small"
      aria-labelledby="mr-remove-title"
    >
      <ModalHeader
        title={`Remove ${count === 1 ? 'resource' : `${count} resources`}?`}
        labelId="mr-remove-title"
        titleIconVariant="warning"
      />
      <ModalBody>
        {fromPR.length > 0 && (
          <Content component="p">
            <strong>{names(fromPR)}</strong>{' '}
            {fromPR.length === 1 ? 'is' : 'are'} part of PR #{pr?.number}.
            Remove from PR takes {fromPR.length === 1 ? 'it' : 'them'} out of
            the pull request on your next save: changes go back to how they are
            on the base branch, and resources the PR added are deleted.
          </Content>
        )}
        {fromPR.some(isDirty) && (
          <Content component="p">
            Closing only discards unsaved changes to{' '}
            <strong>{names(fromPR.filter(isDirty))}</strong>.
          </Content>
        )}
        {edited.length > 0 && (
          <Content component="p">
            Unsaved changes to <strong>{names(edited)}</strong> will be lost.
          </Content>
        )}
        {created.length > 0 && (
          <Content component="p">
            <strong>{names(created)}</strong>{' '}
            {created.length === 1 ? 'has' : 'have'} not been saved yet and will
            be discarded.
          </Content>
        )}
        {fromPR.length === 0 && (
          <Content component="small">
            Nothing is deleted from the repository
            {pr
              ? `, and changes already saved to PR #${pr.number} stay in it`
              : ''}
            .
          </Content>
        )}
      </ModalBody>
      <ModalFooter>
        {fromPR.length > 0 ? (
          <>
            <Button variant="danger" onClick={onRemoveFromPR}>
              Remove from PR
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Only close here
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={onClose}>
            Remove
          </Button>
        )}
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RemoveResourcesModal;
