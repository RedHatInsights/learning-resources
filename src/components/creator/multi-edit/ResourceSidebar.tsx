import React, { useState } from 'react';
import {
  Button,
  Icon,
  Label,
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

type PendingItem = {
  name: string;
  title: string;
  path: string;
  action: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
};

/** A titled list of resources that are not open, each with one action. */
const PendingSection: React.FC<{
  id: string;
  title: string;
  items: PendingItem[];
}> = ({ id, title, items }) =>
  items.length === 0 ? null : (
    <section className="lr-c-multi-edit__removals" aria-labelledby={id}>
      <span id={id} className="lr-c-multi-edit__removals-title">
        {title}
      </span>
      <ul className="lr-c-multi-edit__resource-list">
        {items.map((item) => (
          <li key={item.name} className="lr-c-multi-edit__removal">
            <span
              className="lr-c-multi-edit__removal-name"
              title={`${item.path}/`}
            >
              {item.title}
            </span>
            <Button
              variant="link"
              size="sm"
              isInline
              icon={item.icon}
              aria-label={item.actionLabel}
              onClick={item.onAction}
            >
              {item.action}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );

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
  const term = search.trim().toLowerCase();
  const shown = term
    ? resources.filter(
        (r) =>
          r.name.includes(term) || resourceTitle(r).toLowerCase().includes(term)
      )
    : resources;

  return (
    <nav className="lr-c-multi-edit__sidebar" aria-label="Resources">
      {resources.length >= SEARCH_THRESHOLD && (
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
        {shown.map((r) => {
          const title = resourceTitle(r);
          const dirty = isDirty(r);
          const problem = dirty ? resourceProblem(r, resources) : null;
          const target = dirty ? renameTarget(r) : null;
          const movesTo = target && target !== r.name ? target : null;
          const isActive = r.name === activeName;
          return (
            <li
              key={r.name}
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
                    <span
                      className="lr-c-multi-edit__dirty-dot"
                      aria-hidden="true"
                    />
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
        })}
        {shown.length === 0 && resources.length > 0 && (
          <li className="lr-c-multi-edit__resource-empty">
            No resources match.
          </li>
        )}
      </ul>
      <PendingSection
        id="mr-removals-title"
        title="Changes removed from PR on next save"
        items={removals.map((r) => ({
          name: r.name,
          title: resourceTitle(r),
          path: r.path,
          action: 'Undo',
          actionLabel: `Keep ${resourceTitle(r)} in the PR`,
          icon: <UndoIcon />,
          onAction: () => onUndoRemoval(r.name),
        }))}
      />
      <PendingSection
        id="mr-deletions-title"
        title="To delete on next save"
        items={deletions.map((d) => ({
          name: d.name,
          title: d.title,
          path: d.path,
          action: 'Undo',
          actionLabel: `Keep ${d.title}`,
          icon: <UndoIcon />,
          onAction: () => onUndoDeletion(d.name),
        }))}
      />
      <PendingSection
        id="mr-deleted-title"
        title="Deleted in this PR"
        items={[
          ...deleted.map((d) => ({
            name: d.name,
            title: d.title,
            path: d.path,
            action: 'Restore',
            actionLabel: `Restore ${d.title}`,
            onAction: () => onRestore(d.name),
          })),
          ...restorations.map((d) => ({
            name: d.name,
            title: `${d.title} (restored on save)`,
            path: d.path,
            action: 'Undo',
            actionLabel: `Keep ${d.title} deleted`,
            icon: <UndoIcon />,
            onAction: () => onUndoRestore(d.name),
          })),
        ]}
      />
    </nav>
  );
};

export default ResourceSidebar;
