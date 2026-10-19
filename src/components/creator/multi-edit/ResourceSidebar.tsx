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
import TrashRestoreIcon from '@patternfly/react-icons/dist/dynamic/icons/trash-restore-icon';
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
  /** Tooltip for the action, which is an icon. */
  action: string;
  actionLabel: string;
  onAction: () => void;
  icon: React.ReactNode;
};

type Entry =
  | { key: string; resource: WorkspaceResource }
  | { key: string; pending: PendingEntry };

/** The resource ID a dirty buffer would move an open resource to. */
const movesTo = (r: WorkspaceResource) => {
  const target = isDirty(r) ? renameTarget(r) : null;
  return target && target !== r.name ? target : null;
};

/**
 * Renamed resources first, then the rest of what is open, then everything
 * on its way out of the repository or back into it.
 */
const groupOf = (e: Entry) =>
  'pending' in e ? 2 : e.resource.renamedFrom || movesTo(e.resource) ? 0 : 1;

/**
 * Sorts entries by group, and within a group by when each first appeared.
 * An entry that leaves and comes back goes last in its group again.
 */
function useGroupedOrder(entries: Entry[]): Entry[] {
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
      groupOf(a) - groupOf(b) ||
      (seen.current.get(a.key) as number) - (seen.current.get(b.key) as number)
  );
}

/** Only worth searching once the list stops fitting on screen. */
const SEARCH_THRESHOLD = 8;

/** The row's one action, an icon in the same place on every row. */
const RowAction: React.FC<{
  tooltip: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}> = ({ tooltip, label, icon, onClick, className = '' }) => (
  <Tooltip content={tooltip}>
    <Button
      variant="plain"
      size="sm"
      className={`lr-c-multi-edit__resource-action ${className}`}
      aria-label={label}
      icon={icon}
      onClick={onClick}
    />
  </Tooltip>
);

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

  // Keyed by name alone, so toggling Restore and Undo keeps a row in place.
  const pending = (entry: PendingEntry): Entry => ({
    key: `gone:${entry.name}`,
    pending: entry,
  });
  const entries = useGroupedOrder([
    // A save that renames a resource keeps its place.
    ...resources.map((r) => ({
      key: `open:${r.renamedFrom ?? r.name}`,
      resource: r,
    })),
    ...removals.map((r) =>
      pending({
        name: r.name,
        title: resourceTitle(r),
        path: r.path,
        status: 'Removed from PR',
        color: 'orange',
        isGone: true,
        action: 'Undo removal from PR',
        actionLabel: `Keep ${resourceTitle(r)} in the PR`,
        icon: <UndoIcon />,
        onAction: () => onUndoRemoval(r.name),
      })
    ),
    ...deletions.map((d) =>
      pending({
        name: d.name,
        title: d.title,
        path: d.path,
        status: 'To delete',
        color: 'red',
        isGone: true,
        action: 'Undo delete',
        actionLabel: `Keep ${d.title}`,
        icon: <UndoIcon />,
        onAction: () => onUndoDeletion(d.name),
      })
    ),
    ...deleted.map((d) =>
      pending({
        name: d.name,
        title: d.title,
        path: d.path,
        status: 'Deleted in PR',
        color: 'grey',
        isGone: true,
        action: 'Restore resource',
        actionLabel: `Restore ${d.title}`,
        icon: <TrashRestoreIcon />,
        onAction: () => onRestore(d.name),
      })
    ),
    ...restorations.map((d) =>
      pending({
        name: d.name,
        title: d.title,
        path: d.path,
        status: 'Restored on save',
        color: 'green',
        isGone: false,
        action: 'Undo restore',
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

  // Every row has the same two lines, so the rows are the same height: the
  // title, then the ID with its tags.
  const renderResource = (r: WorkspaceResource, groupStart: string) => {
    const title = resourceTitle(r);
    const dirty = isDirty(r);
    const problem = dirty ? resourceProblem(r, resources) : null;
    const target = movesTo(r);
    const isActive = r.name === activeName;
    return (
      <li
        key={`open:${r.name}`}
        className={`lr-c-multi-edit__resource${
          isActive ? ' pf-m-current' : ''
        }${groupStart}`}
      >
        <button
          type="button"
          className="lr-c-multi-edit__resource-main"
          aria-current={isActive ? 'true' : undefined}
          title={title}
          onClick={() => onSelect(r.name)}
        >
          <span className="lr-c-multi-edit__resource-title">
            {dirty && !r.isNew && (
              <span className="lr-c-multi-edit__dirty-dot" aria-hidden="true" />
            )}
            <span className="lr-c-multi-edit__resource-text">{title}</span>
            {dirty && !r.isNew && (
              <span className="pf-v6-screen-reader"> (unsaved)</span>
            )}
          </span>
          <span className="lr-c-multi-edit__resource-meta">
            <span className="lr-c-multi-edit__resource-dir">
              {target ? `${r.name} → ${target}` : r.name}
            </span>
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
        </button>
        <RowAction
          tooltip="Close"
          label={`Close ${title}`}
          icon={<TimesIcon />}
          onClick={() => onRemove(r.name)}
          className="pf-m-on-hover"
        />
      </li>
    );
  };

  const renderPending = (key: string, p: PendingEntry, groupStart: string) => (
    <li
      key={key}
      className={`lr-c-multi-edit__resource pf-m-pending${groupStart}`}
    >
      <div className="lr-c-multi-edit__resource-main" title={`${p.path}/`}>
        <span
          className={`lr-c-multi-edit__resource-title${
            p.isGone ? ' pf-m-gone' : ''
          }`}
        >
          <span className="lr-c-multi-edit__resource-text">{p.title}</span>
        </span>
        <span className="lr-c-multi-edit__resource-meta">
          <span className="lr-c-multi-edit__resource-dir">{p.name}</span>
          <Label color={p.color} isCompact>
            {p.status}
          </Label>
        </span>
      </div>
      <RowAction
        tooltip={p.action}
        label={p.actionLabel}
        icon={p.icon}
        onClick={p.onAction}
      />
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
        {shown.map((e, i) => {
          // A thin rule where one group gives way to the next.
          const groupStart =
            i > 0 && groupOf(shown[i - 1]) !== groupOf(e)
              ? ' pf-m-group-start'
              : '';
          return 'resource' in e
            ? renderResource(e.resource, groupStart)
            : renderPending(e.key, e.pending, groupStart);
        })}
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
