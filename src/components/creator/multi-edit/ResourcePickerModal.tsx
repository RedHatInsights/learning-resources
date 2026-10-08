import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Content,
  Label,
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
import { QUICKSTARTS_DIR, WorkspacePR } from './workspace';

const READ_CONCURRENCY = 4;

type ResourcePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resources: WorkspaceResourceSnapshot[], baseSha?: string) => void;
  /** Called with resources the author unchecked; the caller confirms it. */
  onRemove: (names: string[]) => void;
  /** When set, resources are read from this PR's head instead of main. */
  pr: WorkspacePR | null;
  /** Resources already in the workspace. They start checked. */
  existing: string[];
  /** Resources with unsaved edits, flagged so unchecking one is deliberate. */
  edited: string[];
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

const plural = (n: number) => `${n} ${n === 1 ? 'resource' : 'resources'}`;

function applyLabel(add: number, remove: number) {
  if (add && remove) return `Add ${add}, remove ${remove}`;
  if (remove) return `Remove ${plural(remove)}`;
  return add ? `Add ${plural(add)}` : 'Add resources';
}

const ResourcePickerModal: React.FC<ResourcePickerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onRemove,
  pr,
  existing,
  edited,
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
    setSearch('');
    // The picker shows the workspace as it is: open resources start checked,
    // and unchecking one removes it.
    setSelected(new Set(existing));
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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selected.has(e.name));

  // Resources not in the repository list (new ones, or ones only on the PR
  // branch) are managed from the sidebar and never removed from here.
  const listed = new Set(entries.map((e) => e.name));
  const toAdd = [...selected].filter((n) => !existing.includes(n));
  const toRemove = existing.filter((n) => listed.has(n) && !selected.has(n));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

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
      filtered.forEach((e) =>
        isSelecting ? next.add(e.name) : next.delete(e.name)
      );
      return next;
    });
  };

  const handleApply = async () => {
    // Removal is confirmed by the caller once this dialog is out of the way.
    const finish = () => {
      onClose();
      if (toRemove.length > 0) onRemove(toRemove);
    };
    const names = toAdd;
    if (names.length === 0) {
      finish();
      return;
    }
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
      // Keep what loaded and the unchecked rows; retry only the failures.
      setSelected(
        new Set([
          ...existing.filter((n) => !toRemove.includes(n)),
          ...loaded.map((r) => r.name),
          ...failed,
        ])
      );
      setError(`Could not load: ${failed.join(', ')}`);
      return;
    }
    finish();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={adding ? undefined : onClose}
      variant="large"
      aria-label="Choose resources"
    >
      <ModalHeader
        title="Choose resources"
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
          {toAdd.length > 0 && ` · ${toAdd.length} to add`}
          {toRemove.length > 0 && ` · ${toRemove.length} to remove`}
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
                const isOpen = existing.includes(entry.name);
                return (
                  <Tr key={entry.name}>
                    <Td
                      select={{
                        rowIndex,
                        onSelect: (_e, isSelecting) =>
                          toggle(entry.name, isSelecting),
                        isSelected: selected.has(entry.name),
                      }}
                    />
                    <Td dataLabel="Title">
                      {entry.displayName}
                      {isOpen && (
                        <Label
                          isCompact
                          color={
                            edited.includes(entry.name) ? 'orange' : 'grey'
                          }
                          className="pf-v6-u-ml-sm"
                        >
                          {edited.includes(entry.name)
                            ? 'Open · unsaved edits'
                            : 'Open'}
                        </Label>
                      )}
                    </Td>
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
          onClick={handleApply}
          isDisabled={!hasChanges || adding}
          isLoading={adding}
        >
          {applyLabel(toAdd.length, toRemove.length)}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={adding}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ResourcePickerModal;
