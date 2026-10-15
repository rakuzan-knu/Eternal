import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes, queryGcTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import type { ConversationView } from '../../../entities/chat/model/types';
import type { ConversationPageQuery } from '@social-network/shared-contracts';

/**
 * Server State: conversation list. Freshness 30s; ordering/previews are
 * patched instantly via Socket.io `setQueryData` (see chatCacheSync).
 */
export function useConversations({
  enabled = true,
  ...options
}: { enabled?: boolean } & Partial<Omit<ConversationPageQuery, 'cursor'>> = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const filters = {
    limit: 25,
    archive: 'active' as const,
    filter: 'ALL' as const,
    search: '',
    ...options,
  };

  const result = useInfiniteQuery({
    queryKey: queryKeys.conversations.page(accountId ?? 'guest', filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      chatApi.getConversationsPage({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => (page.hasMore ? (page.nextCursor ?? undefined) : undefined),
    enabled: isAuthenticated && enabled,
    staleTime: queryStaleTimes.conversations,
    gcTime: queryGcTimes.default,
  });
  useEffect(() => {
    if ((result.error as { response?: { status?: number } } | null)?.response?.status === 410) {
      void queryClient.resetQueries({
        queryKey: queryKeys.conversations.page(accountId ?? 'guest', filters),
        exact: true,
      });
    }
  }, [result.error, queryClient, accountId, filters]);
  const data = useMemo(() => {
    if (!result.data) return undefined;
    const seen = new Set<string>();
    return result.data.pages
      .flatMap((page) => page.data)
      .filter((row: ConversationView) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
  }, [result.data]);
  return { ...result, data };
}
