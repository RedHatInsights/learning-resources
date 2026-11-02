import {
  ResourceIssue,
  validateResource,
  withoutExistingErrors,
} from './validateResource';
import { ALL_KIND_ENTRIES } from './meta';
import { scaffoldResource } from './multi-edit/scaffold';

const valid = `apiVersion: console.openshift.io/v1
kind: QuickStarts
metadata:
  name: insights-inventory
  externalDocumentation: true
  tags:
  - kind: bundle
    value: insights
spec:
  version: 0.1
  type:
    text: Documentation
    color: orange
  displayName: Inventory docs
  icon: ~
  description: Find your hosts.
  link:
    href: https://docs.example.com
    text: View documentation
`;

const errorsIn = (text: string, file: 'content' | 'metadata' = 'content') =>
  validateResource(text, file).filter((i) => i.severity === 'error');
const fields = (issues: ResourceIssue[]) => issues.map((i) => i.field);

describe('validateResource', () => {
  it('accepts a complete resource', () => {
    expect(validateResource(valid, 'content')).toEqual([]);
  });

  it('accepts every kind the new resource wizard creates', () => {
    for (const [kind] of ALL_KIND_ENTRIES) {
      const text = scaffoldResource({
        kind,
        name: 'demo',
        title: 'Demo',
        description: 'A demo.',
        url: 'https://example.com',
        bundles: ['insights'],
      });
      expect(validateResource(text, 'content')).toEqual([]);
    }
  });

  it('blocks what the repository check rejects, naming field and line', () => {
    const broken = valid
      .replace('  displayName: Inventory docs\n', '')
      .replace('color: orange', 'color: pink')
      .replace('version: 0.1', 'version: latest');
    const errors = errorsIn(broken);
    expect(fields(errors)).toEqual([
      'spec.displayName',
      'spec.version',
      'spec.type.color',
    ]);
    expect(errors[2]).toEqual(
      expect.objectContaining({
        line: 13,
        message: expect.stringContaining('"pink" is not allowed'),
      })
    );
  });

  it('blocks a missing spec.type, spec or metadata', () => {
    expect(fields(errorsIn(valid.replace(/ {2}type:\n.*\n.*\n/, '')))).toEqual([
      'spec.type',
    ]);
    expect(fields(errorsIn('metadata:\n  name: a\n'))).toEqual(['spec']);
    expect(fields(errorsIn('spec:\n  displayName: A\n'))).toEqual([
      'metadata',
      'spec.type',
    ]);
  });

  it('blocks a tag kind the seeder cannot store, which breaks the deploy', () => {
    const [error] = errorsIn(valid.replace('kind: bundle', 'kind: bundel'));
    expect(error).toEqual(
      expect.objectContaining({
        field: 'metadata.tags[0].kind',
        line: 7,
        message: expect.stringContaining('fails the content deploy'),
      })
    );
  });

  it('checks the name the folder is named after', () => {
    expect(
      errorsIn(valid.replace('name: insights-inventory', 'name: Inventory'))[0]
        .message
    ).toMatch(/"Inventory" can only use lowercase letters/);
    expect(
      fields(errorsIn(valid.replace('  name: insights-inventory\n', '')))
    ).toEqual(['metadata.name']);
  });

  it('reports a syntax error where the parser finds it, and stops there', () => {
    expect(errorsIn('metadata:\n  name: a\nspec: [unclosed\n')).toEqual([
      expect.objectContaining({
        field: '',
        line: 4,
        message: expect.stringContaining('end with a ]'),
      }),
    ]);
  });

  it('only warns about duplicate keys, which the repository reads', () => {
    const issues = validateResource(
      'kind: QuickStarts\nname: a\nname: a\ntags: []\n',
      'metadata'
    );
    expect(issues).toEqual([
      expect.objectContaining({
        severity: 'warning',
        line: 3,
        message: expect.stringContaining('only one of the values is used'),
      }),
    ]);
  });

  it('only warns about what the repository tolerates', () => {
    const quirky = valid
      .replace('kind: QuickStarts', 'kind: Quickstarts')
      .replace('  description: Find your hosts.\n', '')
      .replace('  icon: ~\n', '  icon: ~\n  review: {}\n')
      .replace(
        '    value: insights\n',
        '    value: insights\n  - kind: use-case\n'
      );
    const issues = validateResource(quirky, 'content');
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(fields(issues)).toEqual([
      'kind',
      'metadata.tags[1].value',
      'spec.description',
      'spec.review',
    ]);
  });

  it('turns a misspelled required field into one problem on its line', () => {
    const issues = validateResource(
      valid.replace('spec:', 'spesc:'),
      'content'
    );
    expect(issues).toEqual([
      expect.objectContaining({
        severity: 'error',
        field: 'spesc',
        line: 9,
        message: expect.stringMatching(/^Did you mean spec\? It is required/),
      }),
    ]);
    expect(
      fields(
        errorsIn(
          valid
            .replace('displayName:', 'displayname:')
            .replace('color:', 'colr:')
            .replace('kind: bundle', 'knd: bundle')
        )
      )
    ).toEqual(['metadata.tags[0].knd', 'spec.type.colr', 'spec.displayname']);
  });

  it('only hints at a misspelled optional field, since it may be left out', () => {
    const issues = validateResource(
      valid
        .replace('  tags:', '  tagz:')
        .replace('icon: ~', 'icons: ~')
        .replace('  link:\n    href', '  link:\n    hre'),
      'content'
    );
    expect(issues.map((i) => [i.severity, i.field, i.message])).toEqual([
      [
        'warning',
        'metadata.tagz',
        'Unknown field; it is ignored. Did you mean tags?',
      ],
      [
        'warning',
        'spec.icons',
        'Unknown field; it is ignored. Did you mean icon?',
      ],
      [
        'warning',
        'spec.link.hre',
        'Unknown field; it is ignored. Did you mean href?',
      ],
      ['warning', 'spec.link.href', 'Empty, so the card links nowhere.'],
    ]);
  });

  it('gives no hint when nothing is close, or the field is already there', () => {
    const issues = validateResource(
      valid.replace('  icon: ~\n', '  icon: ~\n  icons: ~\n  review: {}\n'),
      'content'
    );
    expect(issues.map((i) => i.message)).toEqual([
      'Unknown field; it is ignored.',
      'Unknown field; it is ignored.',
    ]);
  });

  it('checks metadata.yml on its own', () => {
    expect(
      fields(errorsIn('kind: HelpTopic\nname: a\ntags: []\n', 'metadata'))
    ).toEqual(['kind']);
    expect(
      errorsIn('kidn: QuickStarts\nname: a\ntags: []\n', 'metadata')
    ).toEqual([expect.objectContaining({ field: 'kidn', line: 1 })]);
    expect(
      validateResource(
        'kind: QuickStarts\nname: a\ntags:\n- kind: bundle\n  value: x\n',
        'metadata'
      )
    ).toEqual([]);
  });
});

describe('withoutExistingErrors', () => {
  it('turns errors the saved file already had into warnings', () => {
    const saved = validateResource(
      valid.replace(/ {2}type:\n.*\n.*\n/, ''),
      'content'
    );
    const edited = validateResource(
      valid
        .replace(/ {2}type:\n.*\n.*\n/, '')
        .replace('  displayName: Inventory docs\n', ''),
      'content'
    );
    const issues = withoutExistingErrors(edited, saved);
    expect(
      issues.map((i) => [i.field, i.severity, i.existing ?? false])
    ).toEqual([
      ['spec.displayName', 'error', false],
      ['spec.type', 'warning', true],
    ]);
  });
});
