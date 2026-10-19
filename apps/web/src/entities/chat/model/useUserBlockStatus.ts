import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useIsMutating, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '../api/chatApi';

export class UserBlockedError extends Error {
  constructor() {
    super('Following is unavailable while either account has blocked the other.');
  }
}

export function getUserBlockStatus(client: QueryClient, userId: string) {
  const blockedUsers = client.getQueryData<unknown>(queryKeys.conversations.blocked);
  const blockedRows: unknown[] = Array.isArray(blockedUsers) ? blockedUsers : [];
  const blockedByMe = blockedRows.some(
    (user) => user !== null && typeof user === 'object' && 'id' in user && user.id === userId,
  );
  const deniedUntil = client.getQueryData<number>(queryKeys.conversations.blockState(userId));
  const denialUpdatedAt =
    client.getQueryState(queryKeys.conversations.blockState(userId))?.dataUpdatedAt ?? 0;
  let latestReverse: { blocked: boolean; updatedAt: number } | undefined;
  for (const [key, data] of client.getQueriesData<unknown>({
    queryKey: queryKeys.conversations.root,
  })) {
    let rows: unknown[] = [];
    if (Array.isArray(data)) rows = data;
    else if (data !== null && typeof data === 'object') {
      if ('pages' in data && Array.isArray(data.pages)) {
        const pages: unknown[] = data.pages;
        rows = pages.flatMap((page) =>
          page !== null && typeof page === 'object' && 'data' in page && Array.isArray(page.data)
            ? page.data
            : [],
        );
      } else if ('participants' in data) rows = [data];
    }
    const updatedAt = client.getQueryState(key)?.dataUpdatedAt ?? 0;
    for (const conversation of rows) {
      if (
        conversation !== null &&
        typeof conversation === 'object' &&
        'type' in conversation &&
        conversation.type === 'DIRECT' &&
        'blockingMe' in conversation &&
        typeof conversation.blockingMe === 'boolean' &&
        'participants' in conversation &&
        Array.isArray(conversation.participants) &&
        conversation.participants.some(
          (member: unknown) =>
            member !== null &&
            typeof member === 'object' &&
            'userId' in member &&
            member.userId === userId,
        ) &&
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
