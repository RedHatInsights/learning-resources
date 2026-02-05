import { QuickStart } from '@patternfly/quickstarts';

// Test the helper function logic in isolation
// These mirror the implementations in quickstartsStore.ts

describe('quickstartsStore helper functions', () => {
  // Mock QuickStart data
  const mockQuickStart1: QuickStart = {
    metadata: { name: 'quickstart-1' },
    spec: {
      displayName: 'First QuickStart',
      description: 'Description 1',
      icon: null,
      tasks: [],
    },
  };

  const mockQuickStart2: QuickStart = {
    metadata: { name: 'quickstart-2' },
    spec: {
      displayName: 'Second QuickStart',
      description: 'Description 2',
      icon: null,
      tasks: [],
    },
  };

  describe('getAllQuickstarts logic', () => {
    // This tests the exact logic from the store
    const getAllQuickstarts = (quickstarts: {
      [key: string]: QuickStart[];
    }): QuickStart[] => {
      return Object.values(quickstarts)
        .flatMap((qs) => qs)
        .filter((qs): qs is QuickStart => qs != null && qs.metadata != null);
    };

    it('should return empty array when no quickstarts', () => {
      const result = getAllQuickstarts({});
      expect(result).toEqual([]);
    });

    it('should flatten quickstarts from multiple namespaces', () => {
      const quickstarts = {
        app1: [mockQuickStart1],
        app2: [mockQuickStart2],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockQuickStart1);
      expect(result).toContainEqual(mockQuickStart2);
    });

    it('should handle multiple quickstarts in same namespace', () => {
      const quickstarts = {
        myApp: [mockQuickStart1, mockQuickStart2],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(2);
    });

    it('should filter out null entries', () => {
      const quickstarts = {
        myApp: [
          mockQuickStart1,
          null as unknown as QuickStart,
          mockQuickStart2,
        ],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(2);
      expect(result).not.toContain(null);
    });

    it('should filter out undefined entries', () => {
      const quickstarts = {
        myApp: [mockQuickStart1, undefined as unknown as QuickStart],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(1);
    });

    it('should filter out entries without metadata', () => {
      const malformedQuickStart = {
        spec: { displayName: 'No metadata' },
      } as unknown as QuickStart;
      const quickstarts = {
        myApp: [mockQuickStart1, malformedQuickStart],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockQuickStart1);
    });

    it('should filter out entries with null metadata', () => {
      const nullMetadataQuickStart = {
        metadata: null,
        spec: { displayName: 'Null metadata' },
      } as unknown as QuickStart;
      const quickstarts = {
        myApp: [mockQuickStart1, nullMetadataQuickStart],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(1);
    });

    it('should handle empty arrays in namespaces', () => {
      const quickstarts = {
        emptyApp: [],
        myApp: [mockQuickStart1],
      };
      const result = getAllQuickstarts(quickstarts);
      expect(result).toHaveLength(1);
    });
  });

  describe('getQuickstartByName logic', () => {
    const getAllQuickstarts = (quickstarts: {
      [key: string]: QuickStart[];
    }): QuickStart[] => {
      return Object.values(quickstarts)
        .flatMap((qs) => qs)
        .filter((qs): qs is QuickStart => qs != null && qs.metadata != null);
    };

    const getQuickstartByName = (
      quickstarts: { [key: string]: QuickStart[] },
      name: string
    ): QuickStart | undefined => {
      return getAllQuickstarts(quickstarts).find(
        (qs) => qs.metadata.name === name
      );
    };

    it('should find quickstart by name', () => {
      const quickstarts = {
        myApp: [mockQuickStart1, mockQuickStart2],
      };
      const result = getQuickstartByName(quickstarts, 'quickstart-1');
      expect(result).toEqual(mockQuickStart1);
    });

    it('should return undefined for non-existent name', () => {
      const quickstarts = {
        myApp: [mockQuickStart1],
      };
      const result = getQuickstartByName(quickstarts, 'non-existent');
      expect(result).toBeUndefined();
    });

    it('should find quickstart across multiple namespaces', () => {
      const quickstarts = {
        app1: [mockQuickStart1],
        app2: [mockQuickStart2],
      };
      const result = getQuickstartByName(quickstarts, 'quickstart-2');
      expect(result).toEqual(mockQuickStart2);
    });

    it('should not crash with malformed data', () => {
      const quickstarts = {
        myApp: [
          null as unknown as QuickStart,
          undefined as unknown as QuickStart,
          { metadata: null } as unknown as QuickStart,
          mockQuickStart1,
        ],
      };
      // Should not throw
      const result = getQuickstartByName(quickstarts, 'quickstart-1');
      expect(result).toEqual(mockQuickStart1);
    });

    it('should return undefined when searching empty store', () => {
      const result = getQuickstartByName({}, 'any-name');
      expect(result).toBeUndefined();
    });
  });
});
