import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import {
  RepoQuickstartEntry,
  WorkspaceResourceSnapshot,
  getCreatorPRResource,
  getRepoQuickstartContent,
  listRepoQuickstarts,
} from '../../../utils/createQuickstartPR';
import { WorkspacePR } from './workspace';

const QUICKSTARTS_DIR = 'docs/quickstarts';
const READ_CONCURRENCY = 4;

type ResourcePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resources: WorkspaceResourceSnapshot[], baseSha?: string) => void;
  /** When set, resources are read from this PR's head instead of main. */
  pr: WorkspacePR | null;
  /** Resources already in the workspace; they cannot be added twice. */
  existing: string[];
};

/**
 * Reads one selected resource. Inside a saved workspace it comes from the PR
 * head, so the branch it will be committed to and the buffer agree.
 */
async function readResource(
  name: string,
  pr: WorkspacePR | null
): Promise<{ resource: WorkspaceResourceSnapshot; baseSha?: string }> {
  if (pr) {
    const { resource } = await getCreatorPRResource(
      pr.number,
      name,
      pr.headSha
    );
    return { resource };
  }
  const content = await getRepoQuickstartContent(name);
  const dir = `${QUICKSTARTS_DIR}/${content.name || name}`;
  return {
    baseSha: content.headSha,
    resource: {
      name: content.name || name,
      path: dir,
      files: content.files.map((f) => ({ ...f, path: `${dir}/${f.name}` })),
    },
  };
}

const ResourcePickerModal: React.FC<ResourcePickerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  pr,
  existing,
}) => {
  const [entries, setEntries] = useState<RepoQuickstartEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let stale = false;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    listRepoQuickstarts()
      .then((list) => {
        if (!stale) setEntries(list);
      })
      .catch(() => {
        if (!stale) setError('Failed to load resources from the repository.');
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
    return entries.filter(
      (e) =>
        !term ||
        e.name.toLowerCase().includes(term) ||
        e.displayName.toLowerCase().includes(term)
    );
  }, [entries, search]);

  const selectable = filtered.filter((e) => !existing.includes(e.name));
  const allFilteredSelected =
    selectable.length > 0 && selectable.every((e) => selected.has(e.name));

  const toggle = (name: string, isSelecting: boolean) => {
    setSelected((old) => {
      const next = new Set(old);
      if (isSelecting) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const toggleAllFiltered = (isSelecting: boolean) => {
    setSelected((old) => {
      const next = new Set(old);
      selectable.forEach((e) =>
        isSelecting ? next.add(e.name) : next.delete(e.name)
      );
      return next;
    });
  };

  const handleAdd = async () => {
    const names = [...selected];
    setAdding(true);
    setError(null);
    const loaded: WorkspaceResourceSnapshot[] = [];
    const failed: string[] = [];
    let baseSha: string | undefined;
    for (let i = 0; i < names.length; i += READ_CONCURRENCY) {
      const results = await Promise.allSettled(
        names.slice(i, i + READ_CONCURRENCY).map((n) => readResource(n, pr))
      );
      results.forEach((result, j) => {
        if (result.status === 'fulfilled') {
          loaded.push(result.value.resource);
          baseSha = baseSha ?? result.value.baseSha;
        } else {
          failed.push(names[i + j]);
        }
      });
    }
    setAdding(false);

    if (loaded.length > 0) onAdd(loaded, baseSha);
    if (failed.length > 0) {
      setSelected(new Set(failed));
      setError(`Could not load: ${failed.join(', ')}`);
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={adding ? undefined : onClose}
      variant="medium"
      aria-label="Add resources"
    >
      <ModalHeader
        title="Add resources"
        description={
          pr
            ? `Resources are read from the branch of PR #${pr.number}.`
            : 'Resources are read from the main branch of the quickstarts repository.'
        }
      />
      <ModalBody>
        <SearchInput
          placeholder="Search by title or directory"
          value={search}
          onChange={(_e, value) => setSearch(value)}
          onClear={() => setSearch('')}
          aria-label="Search resources"
        />
        <Content component="p" className="pf-v6-u-mt-sm">
          {selected.size} selected
          {search && ` · ${filtered.length} matching`}
        </Content>
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
          <Table aria-label="Repository resources" variant="compact">
            <Thead>
              <Tr>
                <Th
                  select={{
                    onSelect: (_e, isSelecting) =>
                      toggleAllFiltered(isSelecting),
                    isSelected: allFilteredSelected,
                  }}
                  aria-label={
                    search
                      ? 'Select all matching resources'
                      : 'Select all resources'
                  }
                />
                <Th>Title</Th>
                <Th>Directory</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((entry, rowIndex) => {
                const alreadyOpen = existing.includes(entry.name);
                return (
                  <Tr key={entry.name}>
                    <Td
                      select={{
                        rowIndex,
                        onSelect: (_e, isSelecting) =>
                          toggle(entry.name, isSelecting),
                        isSelected: alreadyOpen || selected.has(entry.name),
                        isDisabled: alreadyOpen,
                      }}
                    />
                    <Td dataLabel="Title">{entry.displayName}</Td>
                    <Td dataLabel="Directory">
                      <code>
                        {QUICKSTARTS_DIR}/{entry.name}
                      </code>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleAdd}
          isDisabled={selected.size === 0 || adding}
          isLoading={adding}
        >
          Add {selected.size || ''}{' '}
          {selected.size === 1 ? 'resource' : 'resources'}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={adding}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ResourcePickerModal;
