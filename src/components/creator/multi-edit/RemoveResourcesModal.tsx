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
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirms removing resources that have unsaved work. Removing only closes
 * them here: nothing is deleted from the repository, and changes already
 * committed to the PR stay in it.
 */
const RemoveResourcesModal: React.FC<RemoveResourcesModalProps> = ({
  resources,
  pr,
  onConfirm,
  onCancel,
}) => {
  const lost = resources.filter(isDirty);
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
        {edited.length > 0 && (
          <Content component="p">
            Unsaved changes to{' '}
            <strong>{edited.map(resourceTitle).join(', ')}</strong> will be
            lost.
          </Content>
        )}
        {created.length > 0 && (
          <Content component="p">
            <strong>{created.map(resourceTitle).join(', ')}</strong>{' '}
            {created.length === 1 ? 'has' : 'have'} not been saved yet and will
            be discarded.
          </Content>
        )}
        <Content component="small">
          Nothing is deleted from the repository
          {pr
            ? `, and changes already saved to PR #${pr.number} stay in it`
            : ''}
          .
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={onConfirm}>
          Remove
        </Button>
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RemoveResourcesModal;
