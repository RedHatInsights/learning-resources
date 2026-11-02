import { ALL_KIND_ENTRIES } from './meta';

// The colors quickstarts/cmd/validate accepts for spec.type.color; anything
// else fails the repository's build.
const VALIDATOR_COLORS = [
  'blue',
  'cyan',
  'green',
  'orange',
  'purple',
  'red',
  'grey',
];

describe('item kind meta', () => {
  it.each(ALL_KIND_ENTRIES)(
    'gives %s a tag color the quickstarts validator accepts',
    (_kind, meta) => {
      expect(VALIDATOR_COLORS).toContain(meta.tagColor);
    }
  );
});
