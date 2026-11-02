import YAML from 'yaml';
import { scaffoldResource, slugify } from './scaffold';

describe('scaffoldResource', () => {
  it('writes bundles sorted, then the other tags, like the single-resource creator', () => {
    const doc = YAML.parse(
      scaffoldResource({
        kind: 'documentation',
        name: 'api-guide',
        title: 'API guide',
        description: 'Calling the API.',
        url: 'https://docs.example.com/api',
        bundles: ['openshift', 'insights'],
        tags: { 'use-case': ['automation'], 'product-families': ['rhel'] },
      })
    );
    expect(doc.metadata).toEqual({
      name: 'api-guide',
      externalDocumentation: true,
      tags: [
        { kind: 'bundle', value: 'insights' },
        { kind: 'bundle', value: 'openshift' },
        { kind: 'use-case', value: 'automation' },
        { kind: 'product-families', value: 'rhel' },
      ],
    });
    expect(doc.spec.link).toEqual({
      href: 'https://docs.example.com/api',
      text: 'View documentation',
    });
    expect(doc.spec.durationMinutes).toBeUndefined();
  });

  it('uses the chosen duration for a quick start and adds a starter task', () => {
    const doc = YAML.parse(
      scaffoldResource({
        kind: 'quickstart',
        name: 'first-steps',
        title: 'First steps',
        description: 'Start here.',
        durationMinutes: 25,
        bundles: ['insights'],
      })
    );
    expect(doc.spec.durationMinutes).toBe(25);
    expect(doc.spec.link).toBeUndefined();
    expect(doc.spec.tasks).toHaveLength(1);
  });
});

describe('slugify', () => {
  it('makes a resource ID from a title', () => {
    expect(slugify('  Inventory API: guide! ')).toBe('inventory-api-guide');
    expect(slugify('!!!')).toBe('');
  });
});
