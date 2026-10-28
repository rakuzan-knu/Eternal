import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReelCommentResponseDto } from '@social-network/shared-contracts';
import { nextCursor } from '../../feed/model/feed';
import { reelsApi } from '../api/reelsApi';
import { toggleLike, updateReels, type ReelsData } from './reels';

export const reelKeys = {
  all: (userId: string) => ['mobile', userId, 'reels'] as const,
  feed: (userId: string) => [...reelKeys.all(userId), 'feed'] as const,
  byUser: (userId: string, authorId: string) =>
    [...reelKeys.all(userId), 'user', authorId] as const,
  comments: (userId: string, reelId: string) =>
    [...reelKeys.all(userId), 'comments', reelId] as const,
};

export function useReelsFeed(userId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: reelKeys.feed(userId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => reelsApi.feed(pageParam, signal),
    getNextPageParam: nextCursor,
    staleTime: 120_000,
    enabled,
  });
}

export function useUserReels(userId: string, authorId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: reelKeys.byUser(userId, authorId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => reelsApi.byUser(authorId, pageParam, signal),
    getNextPageParam: nextCursor,
    staleTime: 300_000,
    enabled: enabled && !!authorId,
  });
}

function useReelCacheUpdate(userId: string) {
  const client = useQueryClient();
  return (reelId: string, update: Parameters<typeof updateReels>[2]) => {
    client.setQueriesData<ReelsData>({ queryKey: reelKeys.all(userId) }, (data) =>
      data && 'pages' in data ? updateReels(data, reelId, update) : data,
    );
  };
}

export function useReelActions(userId: string) {
  const patch = useReelCacheUpdate(userId);
  const like = useMutation({
    mutationFn: (reelId: string) => reelsApi.like(reelId),
    onMutate: (reelId) => patch(reelId, toggleLike),
    onError: (_error, reelId) => patch(reelId, toggleLike),
    onSuccess: ({ liked, likesCount }, reelId) =>
      patch(reelId, (reel) => ({ ...reel, isLiked: liked, likesCount })),
  });
  const save = useMutation({
    mutationFn: ({ reelId, saved }: { reelId: string; saved: boolean }) =>
      reelsApi.save(reelId, saved),
    onMutate: ({ reelId, saved }) => patch(reelId, (reel) => ({ ...reel, isSaved: saved })),
    onError: (_error, { reelId, saved }) => patch(reelId, (reel) => ({ ...reel, isSaved: !saved })),
    onSuccess: ({ saved, savedCount }, { reelId }) =>
      patch(reelId, (reel) => ({ ...reel, isSaved: saved, savedCount })),
  });
  const share = useMutation({
    mutationFn: (reelId: string) => reelsApi.share(reelId),
    onSuccess: (_data, reelId) =>
      patch(reelId, (reel) => ({ ...reel, sharesCount: reel.sharesCount + 1 })),
  });
  const view = useMutation({ mutationFn: (reelId: string) => reelsApi.view(reelId) });
  return { like, save, share, view };
}

export function useReelComments(userId: string, reelId: string) {
  return useQuery({
    queryKey: reelKeys.comments(userId, reelId),
    queryFn: ({ signal }) => reelsApi.comments(reelId, signal),
    staleTime: 30_000,
  });
}

export function useAddReelComment(userId: string, reelId: string) {
  const client = useQueryClient();
  const patch = useReelCacheUpdate(userId);
  return useMutation({
    mutationFn: (content: string) => reelsApi.comment(reelId, content),
    onSuccess: (comment) => {
      client.setQueryData<ReelCommentResponseDto[]>(
        reelKeys.comments(userId, reelId),
        (current) => [comment, ...(current ?? [])],
      );
      patch(reelId, (reel) => ({ ...reel, commentsCount: reel.commentsCount + 1 }));
    },
  });
}
