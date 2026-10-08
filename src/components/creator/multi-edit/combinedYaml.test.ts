import {
  combineFiles,
  splitCombined as splitResult,
  tagsAlreadyCombined,
} from './combinedYaml';

/** The successful split, so the assertions can read both files. */
const splitCombined = (
  combined: string,
  metadata: string,
  tagsInContent?: boolean
) =>
  splitResult(combined, metadata, tagsInContent) as {
    metadata: string;
    content: string;
    error?: string;
  };

const metadata = `kind: QuickStarts
name: insights-inventory
tags:
- kind: bundle
  value: insights
- kind: application
  value: inventory
`;

const content = `# Owned by the Inventory docs team
apiVersion: console.openshift.io/v1
kind: QuickStarts
metadata:
  name: insights-inventory
  externalDocumentation: true
spec:
  version: 0.1
  type:
    text: Documentation
    color: orange
  displayName: "Inventory docs"
  icon: ~
  description: Everything about Inventory.
  link:
    href: https://docs.example.com/inventory # old URL
    text: View documentation
`;

describe('combineFiles / splitCombined', () => {
  it('shows the tags under metadata, like the single-resource view', () => {
    const combined = combineFiles(metadata, content);
    expect(combined).toContain(
      '  externalDocumentation: true\n  tags:\n  - kind: bundle\n    value: insights\n'
    );
  });

  it('round-trips both files byte for byte', () => {
    const combined = combineFiles(metadata, content) as string;
    expect(splitCombined(combined, metadata)).toEqual({ metadata, content });
  });

  it('changes only the content file for a URL edit, keeping comments and quoting', () => {
    const combined = combineFiles(metadata, content) as string;
    const edited = combined.replace(
      'https://docs.example.com/inventory',
      'https://docs.redhat.com/inventory'
    );
    const split = splitCombined(edited, metadata);
    expect(split.metadata).toBe(metadata);
    expect(split.content).toBe(
      content.replace(
        'https://docs.example.com/inventory',
        'https://docs.redhat.com/inventory'
      )
    );
  });

  it('changes only the metadata file for a tag edit', () => {
    const combined = combineFiles(metadata, content) as string;
    const edited = combined.replace(
      '    value: inventory\n',
      '    value: inventory\n  - kind: use-case\n    value: observability\n'
    );
    const split = splitCombined(edited, metadata);
    expect(split.content).toBe(content);
    expect(split.metadata).toBe(
      `${metadata}- kind: use-case\n  value: observability\n`
    );
  });

  it('writes an empty tag list when the tags are deleted', () => {
    const combined = combineFiles(metadata, content) as string;
    const withoutTags = combined.replace(/ {2}tags:\n(?: {2}[- ] .*\n)+/, '');
    const split = splitCombined(withoutTags, metadata);
    expect(split.content).toBe(content);
    expect(split.metadata).toBe(
      'kind: QuickStarts\nname: insights-inventory\ntags: []\n'
    );
  });

  it('opens metadata with duplicate keys, as found in the repository', () => {
    const duplicate = metadata.replace(
      '  value: inventory\n',
      '  value: inventory\n  kind: use-case\n'
    );
    const combined = combineFiles(duplicate, content) as string;
    expect(combined).not.toBeNull();
    expect(splitCombined(combined, duplicate)).toEqual({
      metadata: duplicate,
      content,
    });
  });

  it('works with tags at any indentation and metadata without tags', () => {
    const indented = 'kind: QuickStarts\nname: a\n';
    const nested = 'metadata:\n    name: a\nspec:\n    displayName: A\n';
    const combined = combineFiles(indented, nested) as string;
    expect(combined).toBe(
      'metadata:\n    name: a\n    tags: []\nspec:\n    displayName: A\n'
    );
    // An empty tag list means the same as none, so metadata is untouched.
    expect(splitCombined(combined, indented)).toEqual({
      metadata: indented,
      content: nested,
    });
    const tagged = combined.replace(
      'tags: []',
      'tags:\n    - kind: bundle\n      value: rhel'
    );
    expect(splitCombined(tagged, indented)).toEqual({
      metadata: `${indented}tags:\n- kind: bundle\n  value: rhel\n`,
      content: nested,
    });
  });

  describe('content files that already carry the tags', () => {
    // The shape the single-resource creator writes: tags in both files.
    const creatorMetadata = `kind: QuickStarts
name: made-by-creator
tags:
  - kind: bundle
    value: insights
  - kind: content
    value: documentation
`;
    const creatorContent = `apiVersion: console.openshift.io/v1
kind: QuickStarts
metadata:
  name: made-by-creator
  tags:
    - kind: bundle
      value: insights
    - kind: content
      value: documentation
  externalDocumentation: true
spec:
  displayName: Made by the creator
`;

    it('is detected only when both tag lists match', () => {
      expect(tagsAlreadyCombined(creatorMetadata, creatorContent)).toBe(true);
      expect(
        tagsAlreadyCombined(
          creatorMetadata,
          creatorContent.replace('value: insights', 'value: rhel')
        )
      ).toBe(false);
      expect(tagsAlreadyCombined(creatorMetadata, content)).toBe(false);
    });

    it('keeps both files byte for byte when the tags do not change', () => {
      const edited = creatorContent.replace(
        'Made by the creator',
        'Renamed card'
      );
      expect(splitCombined(edited, creatorMetadata, true)).toEqual({
        metadata: creatorMetadata,
        content: edited,
      });
    });

    it('writes a tag edit to both files', () => {
      const edited = creatorContent.replace(
        '    - kind: content\n      value: documentation\n',
        '    - kind: content\n      value: quickstart\n'
      );
      const split = splitCombined(edited, creatorMetadata, true);
      expect(split.content).toBe(edited);
      expect(split.metadata).toBe(
        creatorMetadata.replace('value: documentation', 'value: quickstart')
      );
    });
  });

  it('refuses shapes it cannot merge losslessly', () => {
    expect(combineFiles(metadata, 'metadata: {name: a}\n')).toBeNull();
    expect(
      combineFiles(metadata, 'metadata:\n  name: a\n  tags: []\n')
    ).toBeNull();
    expect(combineFiles(metadata, 'spec: [unclosed')).toBeNull();
    expect(combineFiles('- a\n', content)).toBeNull();
  });

  it('reports a buffer that no longer parses', () => {
    expect(splitCombined('metadata: [', metadata).error).toBeDefined();
    expect(splitCombined('spec: {}\n', metadata).error).toMatch(/metadata/);
  });
});
