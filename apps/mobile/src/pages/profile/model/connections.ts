import * as React from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { feedApi } from '../../feed/api/feedApi';
import { nextCursor, type Page } from '../../feed/model/feed';
import { connectionsApi, type ConnectionKind, type ConnectionUser } from '../api/connectionsApi';

type ConnectionsData = InfiniteData<Page<ConnectionUser>>;

export const connectionKeys = {
  all: (viewerId: string) => ['mobile', viewerId, 'connections'] as const,
  list: (viewerId: string, userId: string, kind: ConnectionKind) =>
    [...connectionKeys.all(viewerId), userId, kind] as const,
  requests: (viewerId: string) => [...connectionKeys.all(viewerId), 'requests'] as const,
  requestCount: (viewerId: string) =>
    [...connectionKeys.all(viewerId), 'requests', 'count'] as const,
};

export function uniqueUsers(data: ConnectionsData | undefined): ConnectionUser[] {
  const seen = new Set<string>();
  return (data?.pages.flatMap((page) => page.data) ?? []).filter(
    (user) => !seen.has(user.id) && !!seen.add(user.id),
  );
}

export function useConnections(
  viewerId: string,
  userId: string,
  kind: ConnectionKind,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: connectionKeys.list(viewerId, userId, kind),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => connectionsApi.list(userId, kind, pageParam, signal),
    getNextPageParam: nextCursor,
    enabled: enabled && !!userId,
    staleTime: 30_000,
  });
}

export function useFollowRequests(viewerId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: connectionKeys.requests(viewerId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => connectionsApi.requests(pageParam, signal),
    getNextPageParam: nextCursor,
    enabled,
  });
}

export function useFollowRequestCount(viewerId: string, enabled: boolean) {
  return useQuery({
    queryKey: connectionKeys.requestCount(viewerId),
    queryFn: ({ signal }) => connectionsApi.requestCount(signal),
    enabled,
    staleTime: 30_000,
  });
}

function removeUser(data: ConnectionsData | undefined, id: string): ConnectionsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.filter((user) => user.id !== id),
    })),
  };
}

export function patchUser(
  data: ConnectionsData | undefined,
  id: string,
  patch: Partial<ConnectionUser>,
): ConnectionsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((user) => (user.id === id ? { ...user, ...patch } : user)),
    })),
  };
}

export type RowFollowState = 'self' | 'none' | 'pending' | 'following';

export function rowFollowState(user: ConnectionUser, viewerId: string): RowFollowState {
  if (user.id === viewerId) return 'self';
  if (user.followStatus === 'following' || user.isFollowing) return 'following';
  if (user.followStatus === 'pending') return 'pending';
  return 'none';
}

/** Follow/unfollow from any list; every cached list showing the user updates. */
export function useToggleFollow(viewerId: string) {
  const client = useQueryClient();
  const patchAll = React.useCallback(
    (id: string, patch: Partial<ConnectionUser>) =>
      client.setQueriesData<ConnectionsData>({ queryKey: connectionKeys.all(viewerId) }, (data) =>
        data && 'pages' in data ? patchUser(data, id, patch) : data,
      ),
    [client, viewerId],
  );
  return useMutation({
    mutationFn: async (user: ConnectionUser) => {
      if (rowFollowState(user, viewerId) === 'none') {
        const { status } = await feedApi.follow(user.id);
        return status === 'ACCEPTED' ? ('following' as const) : ('pending' as const);
      }
      await feedApi.unfollow(user.id);
      return 'none' as const;
    },
    onSuccess: (next, user) =>
      patchAll(user.id, { followStatus: next, isFollowing: next === 'following' }),
    onSettled: () => client.invalidateQueries({ queryKey: ['mobile', viewerId, 'users'] }),
  });
}

export function useRequestDecision(viewerId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ user, accept }: { user: ConnectionUser; accept: boolean }) =>
      accept ? connectionsApi.accept(user.id) : connectionsApi.reject(user.id),
    onSuccess: (_data, { user }) => {
      client.setQueryData<ConnectionsData>(connectionKeys.requests(viewerId), (data) =>
        removeUser(data, user.id),
      );
      client.setQueryData<number>(connectionKeys.requestCount(viewerId), (count) =>
        Math.max(0, (count ?? 1) - 1),
      );
      void client.invalidateQueries({
        queryKey: connectionKeys.list(viewerId, viewerId, 'followers'),
      });
      void client.invalidateQueries({ queryKey: ['mobile', viewerId, 'users'] });
    },
  });
}

export function useRemoveFollower(viewerId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (user: ConnectionUser) => connectionsApi.removeFollower(user.id),
    onSuccess: (_data, user) => {
      client.setQueryData<ConnectionsData>(
        connectionKeys.list(viewerId, viewerId, 'followers'),
        (data) => removeUser(data, user.id),
      );
      void client.invalidateQueries({ queryKey: ['mobile', viewerId, 'users'] });
    },
  });
}
