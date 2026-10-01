import { hydrateFromFiles } from './hydrateFromFiles';
import {
  NAME_BUNDLES,
  NAME_METADATA_NAME,
  NAME_TAGS,
  NAME_TITLE,
} from './steps/common';

describe('hydrateFromFiles', () => {
  it('sets title from spec.displayName', () => {
    const changes: Record<string, unknown> = {};
    const err = hydrateFromFiles(
      [
        {
          name: 'demo.yml',
          content: 'spec:\n  displayName: Demo Quickstart\n',
        },
      ],
      {
        change: (name, value) => {
          changes[name] = value;
        },
      }
    );
    expect(err).toBeNull();
    expect(changes[NAME_TITLE]).toBe('Demo Quickstart');
  });

  it('returns an error when there is no YAML file', () => {
    const err = hydrateFromFiles([{ name: 'readme.md', content: 'nope' }], {
      change: () => {},
    });
    expect(err).toMatch(/No quickstart YAML/);
  });

  it('loads bundle and tag selections from metadata.yaml', () => {
    const change = jest.fn();
    expect(
      hydrateFromFiles(
        [
          {
            name: 'demo.yaml',
            content: 'metadata:\n  name: demo\nspec:\n  displayName: Demo\n',
          },
          {
            name: 'metadata.yaml',
            content:
              'name: demo\ntags:\n  - kind: bundle\n    value: insights\n  - kind: content\n    value: quickstart\n',
          },
        ],
        { change }
      )
    ).toBeNull();

    expect(change).toHaveBeenCalledWith(NAME_METADATA_NAME, 'demo');
    expect(change).toHaveBeenCalledWith(NAME_BUNDLES, ['insights']);
    expect(change).toHaveBeenCalledWith(NAME_TAGS, { content: ['quickstart'] });
  });

  it('honors an empty metadata tag list instead of restoring content tags', () => {
    const change = jest.fn();
    expect(
      hydrateFromFiles(
        [
          {
            name: 'demo.yaml',
            content:
              'metadata:\n  name: demo\n  tags:\n    - kind: bundle\n      value: insights\nspec:\n  displayName: Demo\n',
          },
          { name: 'metadata.yaml', content: 'name: demo\ntags: []\n' },
        ],
        { change }
      )
    ).toBeNull();
    expect(change).toHaveBeenCalledWith(NAME_BUNDLES, []);
    expect(change).toHaveBeenCalledWith(NAME_TAGS, {});
  });

  it('rejects malformed YAML before changing any form values', () => {
    const change = jest.fn();
    expect(
      hydrateFromFiles([{ name: 'demo.yaml', content: 'metadata: [broken' }], {
        change,
      })
    ).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
  });
});
