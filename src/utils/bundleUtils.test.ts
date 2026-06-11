import { getBundleDisplayName } from './bundleUtils';

describe('getBundleDisplayName', () => {
  describe('when FiltersMetadata has a mapping', () => {
    it('returns the part before parentheses when mapping contains parentheses', () => {
      expect(getBundleDisplayName('rhel')).toBe('RHEL');
      expect(getBundleDisplayName('iam')).toBe('IAM');
    });

    it('returns the full mapping when there are no parentheses', () => {
      expect(getBundleDisplayName('settings')).toBe('Settings');
      expect(getBundleDisplayName('insights')).toBe('RHEL');
      expect(getBundleDisplayName('ansible')).toBe('Ansible');
    });
  });

  describe('when FiltersMetadata has no mapping', () => {
    it('returns fallbackTitle when provided', () => {
      expect(
        getBundleDisplayName('unknown-bundle', {
          fallbackTitle: 'Console Settings',
        })
      ).toBe('Console Settings');
    });

    it('returns capitalized bundle id when allowFallback is true (default)', () => {
      expect(getBundleDisplayName('some-bundle')).toBe('Some-bundle');
      expect(getBundleDisplayName('foo')).toBe('Foo');
    });

    it('returns null when allowFallback is false and no fallbackTitle', () => {
      expect(
        getBundleDisplayName('unknown', { allowFallback: false })
      ).toBeNull();
    });

    it('prefers fallbackTitle over allowFallback when both apply', () => {
      expect(
        getBundleDisplayName('unknown', {
          allowFallback: true,
          fallbackTitle: 'Chrome Title',
        })
      ).toBe('Chrome Title');
    });
  });

  describe('priority order', () => {
    it('uses FiltersMetadata over fallbackTitle when both exist', () => {
      expect(
        getBundleDisplayName('settings', { fallbackTitle: 'Console Settings' })
      ).toBe('Settings');
    });
  });
});
