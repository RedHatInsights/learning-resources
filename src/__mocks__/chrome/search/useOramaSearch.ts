import { useCallback, useEffect, useState } from 'react';

interface OramaSearchResult<T> {
  id: string;
  score: number;
  document: T;
}

function useOramaSearch<T extends Record<string, unknown>>(
  data: T[] | undefined,
  schema: Record<string, 'string' | 'string[]' | 'number' | 'boolean'>
) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(!!data?.length);
  }, [data]);

  const query = useCallback(
    async (term: string): Promise<OramaSearchResult<T>[]> => {
      if (!data?.length || !term.trim()) return [];
      const lower = term.toLowerCase();
      const stringFields = Object.entries(schema)
        .filter(([, type]) => type === 'string' || type === 'string[]')
        .map(([key]) => key);

      return data
        .filter((item) =>
          stringFields.some((field) => {
            const value = item[field];
            if (Array.isArray(value)) {
              return value.some(
                (v) => typeof v === 'string' && v.toLowerCase().includes(lower)
              );
            }
            return (
              typeof value === 'string' && value.toLowerCase().includes(lower)
            );
          })
        )
        .map((item, i) => ({ id: String(i), score: 1, document: item }));
    },
    [data, schema]
  );

  return { query, isReady };
}

export default useOramaSearch;
