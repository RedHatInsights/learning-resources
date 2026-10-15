import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertActionLink,
  Button,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import EllipsisVIcon from '@patternfly/react-icons/dist/dynamic/icons/ellipsis-v-icon';
import {
  RepoQuickstartEntry,
  WorkspaceResourceSnapshot,
} from '../../../utils/createQuickstartPR';
import { readResource } from './readResource';
import {
  DeleteResourceMessage,
  DeleteTarget,
  useConfirmDelete,
} from './DeleteResourceModal';
import {
  QUICKSTARTS_DIR,
  WorkspaceState,
  isDirty,
  isInPR,
  resourceTitle,
} from './workspace';

const READ_CONCURRENCY = 4;
const PICKER_ID = 'mr-resource-picker';

type ResourcePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resources: WorkspaceResourceSnapshot[], baseSha?: string) => void;
  /** Called with resources the author unchecked; the caller confirms it. */
  onCloseResources: (names: string[]) => void;
  state: WorkspaceState;
  /** The resources on main. Rows are merged with what the PR has done. */
  catalog: RepoQuickstartEntry[];
  catalogLoading: boolean;
  catalogError: boolean;
  onReloadCatalog: () => void;
  /** Stages a deletion the author confirmed here. */
  onDelete: (
    name: string,
    snapshot?: WorkspaceResourceSnapshot,
    baseSha?: string
  ) => void;
  onUndoDeletion: (name: string) => void;
  onRestore: (name: string) => void;
  onUndoRestore: (name: string) => void;
};

/** What a row stands for, as far as this workspace and its PR go. */
type RowStatus =
  | 'new'
  | 'added'
  | 'renamed'
  | 'renamedAway'
  | 'toDelete'
  | 'deleted'
  | 'toRestore';

interface Row {
  name: string;
  title: string;
  isOpen: boolean;
  isUnsaved: boolean;
  status?: RowStatus;
  /** For `renamedAway`: the directory the PR moved it to. */
  renamedTo?: string;
  /** Exists on main, so it can be deleted on purpose. */
  listed: boolean;
}

const STATUS_LABELS: Record<
  RowStatus,
  { text: string; color: React.ComponentProps<typeof Label>['color'] }
> = {
  new: { text: 'New', color: 'blue' },
  added: { text: 'Added in PR', color: 'blue' },
  renamed: { text: 'Renamed', color: 'purple' },
  renamedAway: { text: 'Renamed', color: 'purple' },
  toDelete: { text: 'To delete', color: 'red' },
  deleted: { text: 'Deleted in PR', color: 'red' },
  toRestore: { text: 'To restore', color: 'green' },
};

/** Rows that can be opened or closed with their checkbox. */
const isSelectable = (row: Row) =>
  !row.status ||
  row.status === 'new' ||
  row.status === 'added' ||
  row.status === 'renamed';

/**
 * The catalog comes from main; the workspace and its PR add what main cannot
 * know about: resources created or renamed on the branch, and deletions.
 */
function buildRows(
  state: WorkspaceState,
  catalog: RepoQuickstartEntry[]
): Row[] {
  const listed = new Set(catalog.map((e) => e.name));
  const open = new Map(state.resources.map((r) => [r.name, r]));
  const byName = (list: { name: string }[]) => new Set(list.map((d) => d.name));
  const toDelete = byName(state.deletions);
  const deleted = byName(state.deleted);
  const toRestore = byName(state.restorations);
  const renamedTo = new Map(
    state.resources
      .filter((r) => r.renamedFrom)
      .map((r) => [r.renamedFrom as string, r.name])
  );
  const statusOf = (name: string): RowStatus | undefined => {
    if (toDelete.has(name)) return 'toDelete';
    if (deleted.has(name)) return 'deleted';
    if (toRestore.has(name)) return 'toRestore';
    if (renamedTo.has(name)) return 'renamedAway';
    const r = open.get(name);
    if (!r || listed.has(name)) return undefined;
    if (r.isNew) return 'new';
    if (r.renamedFrom) return 'renamed';
    return isInPR(state, name) ? 'added' : undefined;
  };
  const row = (name: string, title: string): Row => {
    const r = open.get(name);
    return {
      name,
      title,
      isOpen: !!r,
      isUnsaved: !!r && isDirty(r),
      status: statusOf(name),
      renamedTo: renamedTo.get(name),
      listed: listed.has(name),
    };
  };

  const workspaceOnly = state.resources
    .filter((r) => !listed.has(r.name))
    .map((r) => row(r.name, resourceTitle(r)));
  const fromCatalog = catalog.map((e) => row(e.name, e.displayName));
  // Deletions main no longer lists still need a row to be undone from.
  const seen = new Set([...listed, ...open.keys()]);
  const deletedOnly = [
    ...state.deletions,
    ...state.deleted,
    ...state.restorations,
  ]
    .filter((d) => !seen.has(d.name))
    .map((d) => row(d.name, d.title));
  return [...workspaceOnly, ...fromCatalog, ...deletedOnly];
}

function applySummary(add: number, close: number) {
  return [add && `${add} to add`, close && `${close} to close`]
    .filter(Boolean)
    .join(' · ');
}

const ResourcePickerModal: React.FC<ResourcePickerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onCloseResources,
  state,
  catalog,
  catalogLoading,
  catalogError,
  onReloadCatalog,
  onDelete,
  onUndoDeletion,
  onRestore,
  onUndoRestore,
}) => {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Deleting is confirmed inside this dialog rather than in one stacked on
  // top of it, which keeps the selection and stays visible to screen readers.
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const existing = state.resources.map((r) => r.name);
  const deletion = useConfirmDelete(deleting, state.pr, (snapshot, baseSha) => {
    if (deleting) onDelete(deleting.name, snapshot, baseSha);
    setDeleting(null);
  });

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearch('');
    setDeleting(null);
    // The picker shows the workspace as it is: open resources start checked,
    // and unchecking one closes it.
    setSelected(new Set(existing));
    onReloadCatalog();
  }, [isOpen]);

  const rows = useMemo(() => buildRows(state, catalog), [state, catalog]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        !term ||
        row.name.toLowerCase().includes(term) ||
        row.title.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const selectableFiltered = filtered.filter(isSelectable);
  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((row) => selected.has(row.name));

  const toAdd = [...selected].filter((n) => !existing.includes(n));
  const toClose = existing.filter((n) => !selected.has(n));
  const hasChanges = toAdd.length > 0 || toClose.length > 0;

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
      selectableFiltered.forEach((row) =>
        isSelecting ? next.add(row.name) : next.delete(row.name)
      );
      return next;
    });
  };

  const handleApply = async () => {
    // Closing is confirmed by the caller once this dialog is out of the way.
    const finish = () => {
      onClose();
      if (toClose.length > 0) onCloseResources(toClose);
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
        names
          .slice(i, i + READ_CONCURRENCY)
          .map((n) => readResource(n, state.pr))
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
          ...existing.filter((n) => !toClose.includes(n)),
          ...loaded.map((r) => r.name),
          ...failed,
        ])
      );
      setError(`Could not load: ${failed.join(', ')}`);
      return;
    }
    finish();
  };

  const actionsFor = (row: Row): IAction[] => {
    switch (row.status) {
      case 'toDelete':
        return [
          { title: 'Undo delete', onClick: () => onUndoDeletion(row.name) },
        ];
      case 'deleted':
        return [
          { title: 'Restore resource', onClick: () => onRestore(row.name) },
        ];
      case 'toRestore':
        return [
          { title: 'Undo restore', onClick: () => onUndoRestore(row.name) },
        ];
      case 'new':
      case 'added':
      case 'renamedAway':
        // Not a published resource under this name; nothing to delete.
        return [];
      default:
        return [
          {
            title: 'Delete resource…',
            onClick: () =>
              setDeleting({
                name: row.name,
                title: row.title,
                isOpen: row.isOpen,
                hasUnsavedEdits: row.isUnsaved,
              }),
          },
        ];
    }
  };

  const source = state.pr ? `PR #${state.pr.number} branch` : 'main branch';
  const summary = applySummary(toAdd.length, toClose.length);
  const busy = adding || deletion.loading;

  if (isOpen && deleting) {
    return (
      <Modal
        isOpen
        onClose={busy ? undefined : () => setDeleting(null)}
        width="900px"
        id={PICKER_ID}
        aria-label="Delete resource?"
        className="learning-resources lr-c-multi-edit-picker"
      >
        <ModalHeader title="Delete resource?" titleIconVariant="warning" />
        <ModalBody>
          <DeleteResourceMessage
            target={deleting}
            pr={state.pr}
            error={deletion.error}
          />
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={deletion.confirm}
            isLoading={deletion.loading}
            isDisabled={deletion.loading}
          >
            Delete resource
          </Button>
          <Button
            variant="link"
            onClick={() => setDeleting(null)}
            isDisabled={deletion.loading}
          >
            Back to resources
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      width="900px"
      id={PICKER_ID}
      aria-label="Choose resources"
      // Modals render outside the app root, where its scoped styles stop.
      className="learning-resources lr-c-multi-edit-picker"
    >
      <ModalHeader
        title="Choose resources"
        description={
          <>
            Source: {source} · <code>{QUICKSTARTS_DIR}/</code>
          </>
        }
      />
      <ModalBody className="lr-c-multi-edit-picker__body">
        <div className="lr-c-multi-edit-picker__toolbar">
          <SearchInput
            className="lr-c-multi-edit-picker__search"
            placeholder="Search title or resource ID"
            value={search}
            onChange={(_e, value) => setSearch(value)}
            onClear={() => setSearch('')}
            aria-label="Search resources"
          />
          <span className="lr-c-multi-edit-picker__count" aria-live="polite">
            {selected.size} selected
            {search &&
              ` · ${filtered.length} matching, select all applies to these`}
          </span>
        </div>
        {catalogError && (
          <Alert
            variant="danger"
            isInline
            title="Failed to load resources from the repository."
            actionLinks={
              <AlertActionLink onClick={onReloadCatalog}>Retry</AlertActionLink>
            }
            className="pf-v6-u-mb-sm"
          />
        )}
        {error && (
          <Alert
            variant="danger"
            isInline
            title={error}
            className="pf-v6-u-mb-sm"
          />
        )}
        {catalogLoading && rows.length === 0 ? (
          <Spinner size="lg" className="pf-v6-u-mt-md" />
        ) : (
          <div className="lr-c-multi-edit-picker__list">
            <Table
              aria-label="Repository resources"
              variant="compact"
              isStickyHeader
            >
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
                  <Th>Resource</Th>
                  <Th screenReaderText="Status" />
                  <Th screenReaderText="Actions" />
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((row, rowIndex) => {
                  const label = row.status && STATUS_LABELS[row.status];
                  const actions = actionsFor(row);
                  return (
                    <Tr key={row.name}>
                      <Td
                        select={{
                          rowIndex,
                          onSelect: (_e, isSelecting) =>
                            toggle(row.name, isSelecting),
                          isSelected: selected.has(row.name),
                          isDisabled: !isSelectable(row),
                        }}
                      />
                      <Td dataLabel="Resource">
                        <span className="lr-c-multi-edit-picker__title">
                          {row.title}
                        </span>
                        <span className="lr-c-multi-edit-picker__id">
                          <span className="pf-v6-screen-reader">
                            {QUICKSTARTS_DIR}/
                          </span>
                          {row.name}
                        </span>
                      </Td>
                      <Td
                        dataLabel="Status"
                        className="lr-c-multi-edit-picker__status"
                      >
                        {row.isOpen && (
                          <Label
                            isCompact
                            color={row.isUnsaved ? 'orange' : 'grey'}
                          >
                            {row.isUnsaved ? 'Unsaved' : 'Open'}
                          </Label>
                        )}
                        {label && (
                          <Label isCompact color={label.color}>
                            {row.status === 'renamedAway'
                              ? `Renamed to ${row.renamedTo}`
                              : label.text}
                          </Label>
                        )}
                      </Td>
                      <Td isActionCell>
                        {actions.length > 0 && (
                          <ActionsColumn
                            items={actions}
                            popperProps={{
                              appendTo: () =>
                                document.getElementById(PICKER_ID) ??
                                document.body,
                              position: 'right',
                            }}
                            actionsToggle={({
                              onToggle,
                              isOpen,
                              toggleRef,
                            }) => (
                              <MenuToggle
                                ref={toggleRef}
                                variant="plain"
                                onClick={onToggle}
                                isExpanded={isOpen}
                                aria-label={`Actions for ${row.title}`}
                                icon={<EllipsisVIcon />}
                              />
                            )}
                          />
                        )}
                      </Td>
                    </Tr>
                  );
                })}
                {filtered.length === 0 && !catalogLoading && (
                  <Tr>
                    <Td colSpan={4}>
                      {search
                        ? `No resources match "${search}".`
                        : 'No resources found.'}
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="lr-c-multi-edit-picker__footer">
        <span className="lr-c-multi-edit-picker__summary">{summary}</span>
        <Button
          variant="primary"
          onClick={handleApply}
          isDisabled={!hasChanges || adding}
          isLoading={adding}
        >
          Update workspace
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={adding}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ResourcePickerModal;
