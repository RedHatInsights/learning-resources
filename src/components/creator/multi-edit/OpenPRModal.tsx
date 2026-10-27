import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertActionLink,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import {
  CreatorPREntry,
  CreatorPRWorkspace,
  getCreatorPRWorkspace,
  listCreatorPRs,
} from '../../../utils/createQuickstartPR';

type OpenPRModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (workspace: CreatorPRWorkspace) => void;
  /** Unsaved edits that loading a PR would discard. */
  unsavedCount: number;
};

const OpenPRModal: React.FC<OpenPRModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  unsavedCount,
}) => {
  const [prs, setPrs] = useState<CreatorPREntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /** The PR waiting on the author to confirm discarding unsaved work. */
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConfirming(null);
    let stale = false;
    setLoading(true);
    setError(null);
    listCreatorPRs()
      .then((list) => {
        if (!stale) setPrs(list);
      })
      .catch(() => {
        if (!stale) setError('Failed to load open creator pull requests.');
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return prs.filter(
      (pr) =>
        !term ||
        pr.title.toLowerCase().includes(term) ||
        String(pr.number).includes(term) ||
        pr.branchName.toLowerCase().includes(term)
    );
  }, [prs, search]);

  const handleOpen = async (number: number) => {
    setConfirming(null);
    setLoadingNumber(number);
    setError(null);
    try {
      const workspace = await getCreatorPRWorkspace(number);
      onLoad(workspace);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to load PR #${number}.`
      );
    } finally {
      setLoadingNumber(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loadingNumber ? undefined : onClose}
      variant="medium"
      aria-label="Continue open PR"
    >
      <ModalHeader
        title="Continue open PR"
        description="Loads every resource the pull request changes, as it is on its branch."
      />
      <ModalBody>
        {unsavedCount > 0 &&
          (confirming === null ? (
            <Alert
              variant="warning"
              isInline
              title={`Opening a PR discards ${unsavedCount} unsaved ${
                unsavedCount === 1 ? 'change' : 'changes'
              } in this workspace.`}
              className="pf-v6-u-mb-sm"
            />
          ) : (
            <Alert
              variant="danger"
              isInline
              title={`Discard ${unsavedCount} unsaved ${
                unsavedCount === 1 ? 'change' : 'changes'
              } and open PR #${confirming}?`}
              actionLinks={
                <>
                  <AlertActionLink onClick={() => handleOpen(confirming)}>
                    Discard and open
                  </AlertActionLink>
                  <AlertActionLink onClick={() => setConfirming(null)}>
                    Keep my changes
                  </AlertActionLink>
                </>
              }
              className="pf-v6-u-mb-sm"
            />
          ))}
        <SearchInput
          placeholder="Search by title, number, or branch"
          value={search}
          onChange={(_e, value) => setSearch(value)}
          onClear={() => setSearch('')}
          aria-label="Search pull requests"
        />
        {error && (
          <Alert
            variant="danger"
            isInline
            title={error}
            className="pf-v6-u-mt-sm"
          />
        )}
        {loading ? (
          <Spinner size="lg" className="pf-v6-u-mt-md" />
        ) : (
          <Table aria-label="Open creator pull requests" variant="compact">
            <Thead>
              <Tr>
                <Th>PR</Th>
                <Th>Title</Th>
                <Th>Updated</Th>
                <Th screenReaderText="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((pr) => (
                <Tr key={pr.number}>
                  <Td dataLabel="PR">
                    <a
                      href={pr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      #{pr.number}
                    </a>
                  </Td>
                  <Td dataLabel="Title">{pr.title}</Td>
                  <Td dataLabel="Updated">
                    {pr.updatedAt
                      ? new Date(pr.updatedAt).toLocaleString()
                      : ''}
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <Button
                      variant="secondary"
                      size="sm"
                      // Unsaved work is only discarded once confirmed.
                      onClick={() =>
                        unsavedCount > 0
                          ? setConfirming(pr.number)
                          : handleOpen(pr.number)
                      }
                      isLoading={loadingNumber === pr.number}
                      isDisabled={loadingNumber !== null}
                      aria-label={`Open PR #${pr.number}`}
                    >
                      Open
                    </Button>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <Tr>
                  <Td colSpan={4}>No open creator pull requests.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={loadingNumber !== null}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default OpenPRModal;
