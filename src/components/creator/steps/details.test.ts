import { makeDetailsStep } from './details';
import { NAME_METADATA_NAME, NAME_TITLE } from './common';

const fieldNames = (showResourceId: boolean) =>
  makeDetailsStep({
    kind: 'documentation',
    bundles: [],
    downloadStep: 'download',
    filterData: { categories: [] },
    showResourceId,
  }).fields.map((f) => f.name);

describe('makeDetailsStep', () => {
  it('asks for the resource ID separately from the title for PRs', () => {
    const names = fieldNames(true);
    expect(names).toContain(NAME_METADATA_NAME);
    expect(names.indexOf(NAME_METADATA_NAME)).toBe(
      names.indexOf(NAME_TITLE) + 1
    );
  });

  it('leaves the ID out when pull requests are off', () => {
    expect(fieldNames(false)).not.toContain(NAME_METADATA_NAME);
  });
});
