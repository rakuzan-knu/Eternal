import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userSearchApi } from '../api/userSearchApi';
import { useDebounce } from '@/shared/lib/useDebounce';
import { queryKeys } from '@/shared/api/queryKeys';

const DEBOUNCE_MS = 300;

export function useUserSearch(rawQuery: string) {
  const debouncedQuery = useDebounce(rawQuery, DEBOUNCE_MS);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (rawQuery !== debouncedQuery) {
      void queryClient.cancelQueries({
        queryKey: queryKeys.user.search(debouncedQuery.trim().replace(/^@/, '')),
      });
    }
  }, [rawQuery, debouncedQuery, queryClient]);

  const clean = debouncedQuery.trim().replace(/^@/, '');
  const isValidQuery = clean.length >= 2 && /^[a-zA-Z0-9._]+$/.test(clean);

  const query = useQuery({
    queryKey: queryKeys.user.search(clean),
    queryFn: ({ signal }) => userSearchApi.search(clean, signal),
    enabled: isValidQuery && rawQuery === debouncedQuery,
    staleTime: 1000 * 30,
  });

  return {
    results: isValidQuery ? (query.data ?? []).slice(0, 20) : [],
    isSearching: isValidQuery && query.isFetching,
  };
}
