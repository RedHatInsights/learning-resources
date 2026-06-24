declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'chrome/search/useOramaSearch' {
  interface UseOramaSearchOptions {
    threshold?: number;
    tolerance?: number;
    limit?: number;
    properties?: string[];
    boost?: Record<string, number>;
  }

  interface OramaSearchResult<T> {
    id: string;
    score: number;
    document: T;
  }

  export default function useOramaSearch<T>(
    data: T[] | undefined,
    schema: Record<string, 'string' | 'string[]' | 'number' | 'boolean'>
  ): {
    query: (
      term: string,
      options?: UseOramaSearchOptions
    ) => Promise<OramaSearchResult<T>[]>;
    isReady: boolean;
  };
}