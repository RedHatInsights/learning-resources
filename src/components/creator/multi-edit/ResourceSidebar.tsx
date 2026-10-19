import React, { useRef, useState } from 'react';
import {
  Button,
  Icon,
  Label,
  LabelProps,
  SearchInput,
  Tooltip,
} from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/dynamic/icons/exclamation-circle-icon';
import TimesIcon from '@patternfly/react-icons/dist/dynamic/icons/times-icon';
import UndoIcon from '@patternfly/react-icons/dist/dynamic/icons/undo-icon';
import {
  DeletedResource,
  WorkspaceResource,
  isDirty,
  renameTarget,
  resourceProblem,
  resourceTitle,
} from './workspace';

type ResourceSidebarProps = {
  resources: WorkspaceResource[];
  activeName: string | null;
  onSelect: (name: string) => void;
  onRemove: (name: string) => void;
  /** Resources the next save reverts out of the PR. */
  removals: WorkspaceResource[];
  onUndoRemoval: (name: string) => void;
  /** Resources the next save deletes. */
  deletions: DeletedResource[];
  onUndoDeletion: (name: string) => void;
  /** Resources the PR already deletes, and those the next save restores. */
  deleted: DeletedResource[];
  restorations: DeletedResource[];
  onRestore: (name: string) => void;
  onUndoRestore: (name: string) => void;
};

/** A resource that is not open, with its state and the one action it has. */
type PendingEntry = {
  name: string;
  title: string;
  path: string;
  status: string;
  color: LabelProps['color'];
  /** Struck through: the resource or its changes are going away. */
  isGone: boolean;
  action: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
};

type Entry =
  | { key: string; resource: WorkspaceResource }
  | { key: string; pending: PendingEntry };

/**
 * Sorts entries by when each first appeared, so the list reads in the order
 * things happened: what the PR opened with, then each addition, deletion or
 * restore at the end. An entry that leaves and comes back goes last again.
 */
function useArrivalOrder(entries: Entry[]): Entry[] {
  const seen = useRef(new Map<string, number>());
  const next = useRef(0);
  const keys = new Set(entries.map((e) => e.key));
  for (const key of [...seen.current.keys()]) {
    if (!keys.has(key)) seen.current.delete(key);
  }
  for (const { key } of entries) {
    if (!seen.current.has(key)) seen.current.set(key, next.current++);
  }
  return entries.toSorted(
    (a, b) =>
      (seen.current.get(a.key) as number) - (seen.current.get(b.key) as number)
  );
}

/** Only worth searching once the list stops fitting on screen. */
const SEARCH_THRESHOLD = 8;

const ResourceSidebar: React.FC<ResourceSidebarProps> = ({
  resources,
  activeName,
  onSelect,
  onRemove,
  removals,
  onUndoRemoval,
  deletions,
  onUndoDeletion,
  deleted,
  restorations,
  onRestore,
  onUndoRestore,
}) => {
  const [search, setSearch] = useState('');

  const pending = (status: string, entry: PendingEntry): Entry => ({
    key: `${status}:${entry.name}`,
    pending: entry,
  });
  const entries = useArrivalOrder([
    // A save that renames a resource keeps its place.
    ...resources.map((r) => ({
      key: `open:${r.renamedFrom ?? r.name}`,
      resource: r,
    })),
    ...removals.map((r) =>
      pending('removal', {
        name: r.name,
        title: resourceTitle(r),
        path: r.path,
        status: 'Removed from PR',
        color: 'orange',
        isGone: true,
        action: 'Undo',
        actionLabel: `Keep ${resourceTitle(r)} in the PR`,
        icon: <UndoIcon />,
        onAction: () => onUndoRemoval(r.name),
      })
    ),
    ...deletions.map((d) =>
      pending('deletion', {
        name: d.name,
        title: d.title,
        path: d.path,
        status: 'To delete',
        color: 'red',
        isGone: true,
        action: 'Undo',
        actionLabel: `Keep ${d.title}`,
        icon: <UndoIcon />,
        onAction: () => onUndoDeletion(d.name),
      })
    ),
    ...deleted.map((d) =>
      pending('deleted', {
        name: d.name,
        title: d.title,
        path: d.path,
        status: 'Deleted in PR',
        color: 'grey',
        isGone: true,
        action: 'Restore',
        actionLabel: `Restore ${d.title}`,
        onAction: () => onRestore(d.name),
      })
    ),
    ...restorations.map((d) =>
      pending('restoration', {
        name: d.name,
        title: d.title,
        path: d.path,
        status: 'Restored on save',
        color: 'green',
        isGone: false,
        action: 'Undo',
        actionLabel: `Keep ${d.title} deleted`,
        icon: <UndoIcon />,
        onAction: () => onUndoRestore(d.name),
      })
    ),
  ]);

  const term = search.trim().toLowerCase();
  const shown = term
    ? entries.filter((e) => {
        const [name, title] =
          'resource' in e
            ? [e.resource.name, resourceTitle(e.resource)]
            : [e.pending.name, e.pending.title];
        return name.includes(term) || title.toLowerCase().includes(term);
      })
    : entries;

  const renderResource = (r: WorkspaceResource) => {
    const title = resourceTitle(r);
    const dirty = isDirty(r);
    const problem = dirty ? resourceProblem(r, resources) : null;
    const target = dirty ? renameTarget(r) : null;
    const movesTo = target && target !== r.name ? target : null;
    const isActive = r.name === activeName;
    return (
      <li
        key={`open:${r.name}`}
        className={`lr-c-multi-edit__resource${
          isActive ? ' pf-m-current' : ''
        }`}
      >
        <button
          type="button"
          className="lr-c-multi-edit__resource-select"
          aria-current={isActive ? 'true' : undefined}
          onClick={() => onSelect(r.name)}
        >
          <span className="lr-c-multi-edit__resource-title">
            {dirty && !r.isNew && (
              <span className="lr-c-multi-edit__dirty-dot" aria-hidden="true" />
            )}
            {title}
            {dirty && !r.isNew && (
              <span className="pf-v6-screen-reader"> (unsaved)</span>
            )}
          </span>
          {(title !== r.name || movesTo) && (
            <span className="lr-c-multi-edit__resource-dir">
              {movesTo ? `${r.name} → ${movesTo}` : r.name}
            </span>
          )}
          {(r.isNew || r.renamedFrom || problem) && (
            <span className="lr-c-multi-edit__resource-badges">
              {r.isNew && (
                <Label color="blue" isCompact>
                  New
                </Label>
              )}
              {r.renamedFrom && (
                <Tooltip content={`Renamed from ${r.renamedFrom}`}>
                  <Label color="purple" isCompact>
                    Renamed
                    <span className="pf-v6-screen-reader">
                      {' '}
                      from {r.renamedFrom}
                    </span>
                  </Label>
                </Tooltip>
              )}
              {problem && (
                <Tooltip content={problem}>
                  <Icon status="danger" size="sm">
                    <ExclamationCircleIcon aria-label="Has a problem" />
                  </Icon>
                </Tooltip>
              )}
            </span>
          )}
        </button>
        <Button
          variant="plain"
          size="sm"
          className="lr-c-multi-edit__resource-remove"
          aria-label={`Close ${title}`}
          icon={<TimesIcon />}
          onClick={() => onRemove(r.name)}
        />
      </li>
    );
  };

  const renderPending = (key: string, p: PendingEntry) => (
    <li key={key} className="lr-c-multi-edit__resource pf-m-pending">
      <div className="lr-c-multi-edit__resource-info">
        <span
          className={`lr-c-multi-edit__resource-title${
            p.isGone ? ' pf-m-gone' : ''
          }`}
        >
          {p.title}
        </span>
        {p.title !== p.name && (
          <span className="lr-c-multi-edit__resource-dir" title={`${p.path}/`}>
            {p.name}
          </span>
        )}
        <span className="lr-c-multi-edit__resource-badges">
          <Label color={p.color} isCompact>
            {p.status}
          </Label>
        </span>
      </div>
      <Button
        variant="link"
        size="sm"
        isInline
        className="lr-c-multi-edit__resource-action"
        icon={p.icon}
        aria-label={p.actionLabel}
        onClick={p.onAction}
      >
        {p.action}
      </Button>
    </li>
  );

  return (
    <nav className="lr-c-multi-edit__sidebar" aria-label="Resources">
      {entries.length >= SEARCH_THRESHOLD && (
        <SearchInput
          className="lr-c-multi-edit__sidebar-search"
          placeholder="Filter resources"
          value={search}
          onChange={(_e, value) => setSearch(value)}
          onClear={() => setSearch('')}
          aria-label="Filter resources"
        />
      )}
      <ul className="lr-c-multi-edit__resource-list">
        {shown.map((e) =>
          'resource' in e
            ? renderResource(e.resource)
            : renderPending(e.key, e.pending)
        )}
        {shown.length === 0 && entries.length > 0 && (
          <li className="lr-c-multi-edit__resource-empty">
            No resources match.
          </li>
        )}
      </ul>
    </nav>
  );
};

export default ResourceSidebar;
