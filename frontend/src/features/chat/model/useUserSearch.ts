import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userSearchApi } from '../api/userSearchApi';

const DEBOUNCE_MS = 300;

export function useUserSearch(rawQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const clean = debouncedQuery.trim().replace(/^@/, '');
  const isValidQuery = clean.length >= 2 && /^[a-zA-Z0-9._]+$/.test(clean);

  const query = useQuery({
    queryKey: ['user-search', clean],
    queryFn: () => userSearchApi.search(clean),
    enabled: isValidQuery,
    staleTime: 1000 * 30,
  });

  return {
    results: isValidQuery ? (query.data ?? []).slice(0, 20) : [],
    isSearching: isValidQuery && query.isFetching,
  };
}
