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
import {
  WorkspaceResource,
  isDirty,
  resourceProblem,
  resourceTitle,
} from './workspace';

type ResourceSidebarProps = {
  resources: WorkspaceResource[];
  activeName: string | null;
  onSelect: (name: string) => void;
  onRemove: (name: string) => void;
};

/** Only worth searching once the list stops fitting on screen. */
const SEARCH_THRESHOLD = 8;

const ResourceSidebar: React.FC<ResourceSidebarProps> = ({
  resources,
  activeName,
  onSelect,
  onRemove,
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
          const problem = dirty ? resourceProblem(r) : null;
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
                {title !== r.name && (
                  <span className="lr-c-multi-edit__resource-dir">
                    {r.name}
                  </span>
                )}
                {(r.isNew || problem) && (
                  <span className="lr-c-multi-edit__resource-badges">
                    {r.isNew && (
                      <Label color="blue" isCompact>
                        New
                      </Label>
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
                aria-label={`Remove ${title}`}
                icon={<TimesIcon />}
                onClick={() => onRemove(r.name)}
              />
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="lr-c-multi-edit__resource-empty">
            No resources match.
          </li>
        )}
      </ul>
    </nav>
  );
};

export default ResourceSidebar;
