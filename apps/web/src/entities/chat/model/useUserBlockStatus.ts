import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useIsMutating, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '../api/chatApi';
import type { ConversationView, InfiniteConversationsData, UserSnapshot } from './types';

export class UserBlockedError extends Error {
  constructor() {
    super('Following is unavailable while either account has blocked the other.');
  }
}

export function getUserBlockStatus(client: QueryClient, userId: string) {
  const blockedByMe =
    client
      .getQueryData<UserSnapshot[]>(queryKeys.conversations.blocked)
      ?.some((user) => user.id === userId) ?? false;
  const deniedUntil = client.getQueryData<number>(queryKeys.conversations.blockState(userId));
  const denialUpdatedAt =
    client.getQueryState(queryKeys.conversations.blockState(userId))?.dataUpdatedAt ?? 0;
  let latestReverse: { blocked: boolean; updatedAt: number } | undefined;
  for (const [key, data] of client.getQueriesData<
    ConversationView[] | ConversationView | InfiniteConversationsData
  >({ queryKey: queryKeys.conversations.root })) {
    const rows = Array.isArray(data)
      ? data
      : data && 'pages' in data
        ? data.pages.flatMap((page) => page.data)
        : data && 'participants' in data
          ? [data]
          : [];
    const updatedAt = client.getQueryState(key)?.dataUpdatedAt ?? 0;
    for (const conversation of rows) {
      if (
        conversation.type === 'DIRECT' &&
        typeof conversation.blockingMe === 'boolean' &&
        conversation.participants.some((member) => member.userId === userId) &&
        (!latestReverse || updatedAt >= latestReverse.updatedAt)
      ) {
        latestReverse = { blocked: conversation.blockingMe, updatedAt };
      }
    }
  }
  const knownBlocked =
    typeof deniedUntil === 'number' &&
    deniedUntil > Date.now() &&
    !(latestReverse && !latestReverse.blocked && latestReverse.updatedAt > denialUpdatedAt);
  return { blockedByMe, isBlocked: blockedByMe || knownBlocked || Boolean(latestReverse?.blocked) };
}

/** A shared view of server-confirmed blocks; a reverse block is learned from chat or an explicit follow denial. */
export function useUserBlockStatus(userId: string) {
  const client = useQueryClient();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const blocked = useQuery({
    queryKey: queryKeys.conversations.blocked,
    queryFn: chatApi.getBlockedUsers,
    enabled: authenticated,
    staleTime: queryStaleTimes.conversations,
  });
  const denial = useQuery<number>({
    queryKey: queryKeys.conversations.blockState(userId),
    enabled: false,
  });
  useEffect(() => {
    if (typeof denial.data !== 'number') return;
    const timer = setTimeout(
      () =>
        client.removeQueries({ queryKey: queryKeys.conversations.blockState(userId), exact: true }),
      Math.max(0, denial.data - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [client, userId, denial.data]);
  const subscribe = useCallback(
    (listener: () => void) => client.getQueryCache().subscribe(listener),
    [client],
  );
  const snapshot = useCallback(() => {
    const status = getUserBlockStatus(client, userId);
    return status.blockedByMe ? 2 : status.isBlocked ? 1 : 0;
  }, [client, userId]);
  const status = useSyncExternalStore(subscribe, snapshot, snapshot);
  const pending =
    useIsMutating({
      mutationKey: queryKeys.conversations.blockMutation,
      predicate: (mutation) => mutation.state.variables === userId,
    }) > 0;
  return {
    blockedByMe: status === 2,
    isBlocked: status > 0,
    isPending: pending,
    isLoading: blocked.isLoading,
  };
}
