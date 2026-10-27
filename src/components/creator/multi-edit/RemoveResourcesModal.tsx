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
  /** Names of the resources the PR itself added. */
  addedByPR: string[];
  /** Close the resources and revert the ones in the PR on the next save. */
  onRemoveFromPR: () => void;
  /** Only close the resources here; the PR keeps whatever it has. */
  onClose: () => void;
  onCancel: () => void;
};

const names = (resources: WorkspaceResource[]) =>
  resources.map(resourceTitle).join(', ');

/**
 * Confirms closing resources that have unsaved work or that the PR changes.
 * For the latter the author chooses: remove their changes from the PR
 * (applied on the next save, so it can still be undone), or only close them
 * here. Neither deletes a published resource; that is Delete resource.
 */
const RemoveResourcesModal: React.FC<RemoveResourcesModalProps> = ({
  resources,
  pr,
  inPR,
  addedByPR,
  onRemoveFromPR,
  onClose,
  onCancel,
}) => {
  const fromPR = pr ? resources.filter((r) => inPR.includes(r.name)) : [];
  const lost = resources.filter((r) => isDirty(r) && !inPR.includes(r.name));
  const created = lost.filter((r) => r.isNew);
  const edited = lost.filter((r) => !r.isNew);
  const count = resources.length;
  const fromPRAdded = fromPR.filter((r) => addedByPR.includes(r.name));
  const fromPREdited = fromPR.filter((r) => !addedByPR.includes(r.name));
  const onlyNew = created.length === count;

  return (
    <Modal
      isOpen={count > 0}
      onClose={onCancel}
      variant="small"
      aria-labelledby="mr-remove-title"
      // Modals render outside the app root, where its scoped styles stop.
      className="learning-resources"
    >
      <ModalHeader
        title={
          onlyNew
            ? `Discard new ${count === 1 ? 'resource' : `${count} resources`}?`
            : `Close ${count === 1 ? 'resource' : `${count} resources`}?`
        }
        labelId="mr-remove-title"
        titleIconVariant="warning"
      />
      <ModalBody>
        {fromPREdited.length > 0 && (
          <Content component="p">
            <strong>{names(fromPREdited)}</strong>{' '}
            {fromPREdited.length === 1 ? 'is' : 'are'} changed by PR #
            {pr?.number}. Remove changes from PR restores{' '}
            {fromPREdited.length === 1 ? 'it' : 'them'} to how{' '}
            {fromPREdited.length === 1 ? 'it was' : 'they were'} before this PR
            on your next save.
          </Content>
        )}
        {fromPRAdded.length > 0 && (
          <Content component="p">
            <strong>{names(fromPRAdded)}</strong>{' '}
            {fromPRAdded.length === 1 ? 'was' : 'were'} added by PR #
            {pr?.number}. Remove changes from PR undoes the addition on your
            next save.
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
        {!onlyNew && (
          <Content component="small">
            {fromPR.length > 0
              ? 'Close only keeps everything already saved to the PR. '
              : ''}
            Closing never deletes a published resource
            {fromPR.length === 0 && pr
              ? `, and changes already saved to PR #${pr.number} stay in it`
              : ''}
            . To delete one, use Delete resource.
          </Content>
        )}
      </ModalBody>
      <ModalFooter>
        {fromPR.length > 0 ? (
          <>
            <Button variant="danger" onClick={onRemoveFromPR}>
              Remove changes from PR
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close only
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={onClose}>
            {onlyNew
              ? 'Discard'
              : count === 1
              ? 'Close resource'
              : 'Close resources'}
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
