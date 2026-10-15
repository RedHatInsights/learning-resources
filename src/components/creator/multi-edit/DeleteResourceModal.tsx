import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { WorkspaceResourceSnapshot } from '../../../utils/createQuickstartPR';
import { readResource } from './readResource';
import { QUICKSTARTS_DIR, WorkspacePR } from './workspace';

export interface DeleteTarget {
  name: string;
  title: string;
  /** Open in the workspace, so its files are already loaded. */
  isOpen: boolean;
  hasUnsavedEdits?: boolean;
}

export type ConfirmDelete = (
  snapshot?: WorkspaceResourceSnapshot,
  baseSha?: string
) => void;

/**
 * Confirms a deletion, first reading a resource that is not open so the
 * review can show what the deletion removes.
 */
export function useConfirmDelete(
  target: DeleteTarget | null,
  pr: WorkspacePR | null,
  onConfirm: ConfirmDelete
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
    setError(null);
  }, [target?.name]);

  const confirm = async () => {
    if (!target) return;
    if (target.isOpen) {
      onConfirm();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { resource, baseSha } = await readResource(target.name, pr);
      setLoading(false);
      onConfirm(resource, baseSha);
    } catch {
      setLoading(false);
      setError(`Could not load ${target.name}. Try again.`);
    }
  };

  return { loading, error, confirm };
}

/** What deleting the resource does, said the same way wherever it is asked. */
export const DeleteResourceMessage: React.FC<{
  target: DeleteTarget;
  pr: WorkspacePR | null;
  error: string | null;
}> = ({ target, pr, error }) => (
  <>
    <Content component="p">
      <strong>{target.title}</strong> and every file in{' '}
      <code>
        {QUICKSTARTS_DIR}/{target.name}/
      </code>{' '}
      will be deleted by{' '}
      {pr ? `PR #${pr.number}` : 'the pull request you create'}. The published
      catalog changes after it merges and is deployed.
    </Content>
    {target.hasUnsavedEdits && (
      <Content component="p">
        Its unsaved edits are kept until you save, so Undo brings them back.
      </Content>
    )}
    <Content component="small">
      You can undo this until you save. The page its link points to is not
      affected.
    </Content>
    {error && (
      <Alert
        variant="danger"
        isInline
        title={error}
        className="pf-v6-u-mt-sm"
      />
    )}
  </>
);

type DeleteResourceModalProps = {
  /** The resource to delete; the dialog is open while this is set. */
  target: DeleteTarget | null;
  pr: WorkspacePR | null;
  onConfirm: ConfirmDelete;
  onCancel: () => void;
};

/**
 * Confirms deleting an existing resource from the repository. Nothing is
 * deleted until the next save, and until then it can be undone.
 */
const DeleteResourceModal: React.FC<DeleteResourceModalProps> = ({
  target,
  pr,
  onConfirm,
  onCancel,
}) => {
  const { loading, error, confirm } = useConfirmDelete(target, pr, onConfirm);

  return (
    <Modal
      isOpen={!!target}
      onClose={loading ? undefined : onCancel}
      variant="small"
      aria-labelledby="mr-delete-title"
      // Modals render outside the app root, where its scoped styles stop.
      className="learning-resources"
    >
      <ModalHeader
        title="Delete resource?"
        labelId="mr-delete-title"
        titleIconVariant="warning"
      />
      {target && (
        <ModalBody>
          <DeleteResourceMessage target={target} pr={pr} error={error} />
        </ModalBody>
      )}
      <ModalFooter>
        <Button
          variant="danger"
          onClick={confirm}
          isLoading={loading}
          isDisabled={loading}
        >
          Delete resource
        </Button>
        <Button variant="link" onClick={onCancel} isDisabled={loading}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteResourceModal;
