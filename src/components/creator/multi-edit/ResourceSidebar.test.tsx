import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ResourceSidebar from './ResourceSidebar';
import { WorkspaceResource } from './workspace';

const resource = (name: string, title: string): WorkspaceResource => {
  const buffer = `metadata:\n  name: ${name}\nspec:\n  displayName: ${title}\n`;
  return {
    name,
    path: `docs/quickstarts/${name}`,
    layout: 'combined',
    isNew: false,
    baseline: buffer,
    buffer,
  };
};

const renderSidebar = (resources: WorkspaceResource[]) =>
  render(
    <ResourceSidebar
      resources={resources}
      activeName={resources[0]?.name ?? null}
      onSelect={jest.fn()}
      onRemove={jest.fn()}
      removals={[]}
      onUndoRemoval={jest.fn()}
      deletions={[]}
      onUndoDeletion={jest.fn()}
      deleted={[]}
      restorations={[]}
      onRestore={jest.fn()}
      onUndoRestore={jest.fn()}
    />
  );

const rows = () =>
  within(screen.getByRole('navigation', { name: 'Resources' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

const many = Array.from({ length: 8 }, (_, i) =>
  resource(`res-${i}`, `Resource ${i}`)
);

describe('ResourceSidebar', () => {
  it('only offers a filter once the list is long', () => {
    renderSidebar(many.slice(0, 7));
    expect(
      screen.queryByRole('textbox', { name: 'Filter resources' })
    ).not.toBeInTheDocument();
  });

  it('filters by title or resource ID, and says when nothing matches', () => {
    renderSidebar([...many.slice(1), resource('apis', 'Insights APIs')]);
    const filter = screen.getByRole('textbox', { name: 'Filter resources' });

    fireEvent.change(filter, { target: { value: 'insights' } });
    expect(rows()).toEqual([expect.stringContaining('Insights APIs')]);

    fireEvent.change(filter, { target: { value: 'res-3' } });
    expect(rows()).toEqual([expect.stringContaining('Resource 3')]);

    fireEvent.change(filter, { target: { value: 'nothing' } });
    expect(rows()).toEqual(['No resources match.']);
  });
});
