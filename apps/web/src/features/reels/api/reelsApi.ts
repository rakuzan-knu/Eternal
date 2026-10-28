import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';
import { prepareDirectUploadForm } from '@shared/api-client';
import {
  REEL_COMMENTS_KEY,
  REELS_FEED_KEY,
  USER_REELS_KEY,
  queryKeys,
} from '@/shared/api/queryKeys';

export * from '@/entities/reel';
import { type ReelItem, type ReelAuthor } from '@/entities/reel';

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: ReelAuthor;
}

export interface PaginatedReels {
  data: ReelItem[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export function useReelsFeed(limit = 10) {
  return useInfiniteQuery<PaginatedReels>({
    queryKey: [REELS_FEED_KEY],
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await apiClient.get<PaginatedReels>('/reels/feed', {
        params: { limit, after: pageParam },
        signal,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? (lastPage.meta.nextCursor ?? undefined) : undefined,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useUserReels(userId: string, limit = 12) {
  return useInfiniteQuery<PaginatedReels>({
    queryKey: [USER_REELS_KEY, userId],
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await apiClient.get<PaginatedReels>(`/reels/user/${userId}`, {
        params: { limit, after: pageParam },
        signal,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? (lastPage.meta.nextCursor ?? undefined) : undefined,
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useReel(id: string) {
  return useQuery<ReelItem>({
    queryKey: ['reel', id],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ReelItem>(`/reels/${id}`, { signal });
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useSavedReels(userId: string, after?: string) {
  return useQuery<PaginatedReels>({
    queryKey: queryKeys.reels.saved(userId, after),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<PaginatedReels>('/reels/saved', {
        params: { limit: 12, after },
        signal,
      });
      return data;
    },
    enabled: Boolean(userId),
    gcTime: 60_000,
  });
}

export function useToggleLikeReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      const { data } = await apiClient.post<{ liked: boolean; likesCount: number }>(
        `/reels/${reelId}/like`,
      );
      return { reelId, ...data };
    },
    onMutate: async (reelId) => {
      // Snapshot previous feed for optimistic rollback
      await queryClient.cancelQueries({ queryKey: [REELS_FEED_KEY] });
      const previous = queryClient.getQueryData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
        [REELS_FEED_KEY],
      );

      if (previous) {
        queryClient.setQueryData([REELS_FEED_KEY], {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            data: page.data.map((r) =>
              r.id === reelId
                ? {
                    ...r,
                    isLiked: !r.isLiked,
                    likesCount: r.isLiked ? Math.max(0, r.likesCount - 1) : r.likesCount + 1,
                  }
                : r,
            ),
          })),
        });
      }

      return { previous };
    },
    onError: (_err, _reelId, context) => {
      if (context?.previous) {
        queryClient.setQueryData([REELS_FEED_KEY], context.previous);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reels.savedRoot });
      void queryClient.invalidateQueries({ queryKey: [USER_REELS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['reel'] });
    },
  });
}

export function useRecordReelView() {
  return useMutation({
    mutationFn: async (reelId: string) => {
      await apiClient.post(`/reels/${reelId}/view`);
    },
  });
}

export function useRecordReelShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      const { data } = await apiClient.post<{ success: boolean }>(`/reels/${reelId}/share`);
      if (!data.success) throw new Error('Could not record the share');
    },
    onSuccess: (_data, reelId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reels.savedRoot });
      for (const key of [REELS_FEED_KEY, USER_REELS_KEY]) {
        queryClient.setQueriesData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
          { queryKey: [key] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((reel) =>
                  reel.id === reelId ? { ...reel, sharesCount: reel.sharesCount + 1 } : reel,
                ),
              })),
            };
          },
        );
      }
      queryClient.setQueryData<ReelItem>(['reel', reelId], (old) =>
        old ? { ...old, sharesCount: old.sharesCount + 1 } : old,
      );
    },
  });
}

export function useToggleSaveReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reelId, saved }: { reelId: string; saved: boolean }) => {
      const url = `/reels/${reelId}/save`;
      const { data } = saved
        ? await apiClient.post<{ saved: boolean; savedCount: number }>(url)
        : await apiClient.delete<{ saved: boolean; savedCount: number }>(url);
      return { reelId, ...data };
    },
    onSuccess: ({ reelId, saved, savedCount }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reels.savedRoot });
      for (const key of [REELS_FEED_KEY, USER_REELS_KEY]) {
        queryClient.setQueriesData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
          { queryKey: [key] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((reel) =>
                  reel.id === reelId ? { ...reel, isSaved: saved, savedCount } : reel,
                ),
              })),
            };
          },
        );
      }
      queryClient.setQueryData<ReelItem>(['reel', reelId], (old) =>
        old ? { ...old, isSaved: saved, savedCount } : old,
      );
    },
  });
}

export function useReelComments(reelId: string) {
  return useQuery<ReelComment[]>({
    queryKey: [REEL_COMMENTS_KEY, reelId],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<ReelComment[]>(`/reels/${reelId}/comments`, { signal });
      return data;
    },
    enabled: Boolean(reelId),
  });
}

export function useAddReelComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reelId, content }: { reelId: string; content: string }) => {
      const { data } = await apiClient.post<ReelComment>(`/reels/${reelId}/comments`, {
        content,
      });
      return data;
    },
    onSuccess: async (newComment, { reelId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reels.savedRoot });
      await queryClient.cancelQueries({ queryKey: [REEL_COMMENTS_KEY, reelId] });
      queryClient.setQueryData<ReelComment[]>([REEL_COMMENTS_KEY, reelId], (old) => [
        newComment,
        ...(old ?? []).filter((comment) => comment.id !== newComment.id),
      ]);

      for (const key of [REELS_FEED_KEY, USER_REELS_KEY]) {
        queryClient.setQueriesData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
          { queryKey: [key] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((reel) =>
                  reel.id === reelId ? { ...reel, commentsCount: reel.commentsCount + 1 } : reel,
                ),
              })),
            };
          },
        );
      }
      queryClient.setQueryData<ReelItem>(['reel', reelId], (old) =>
        old ? { ...old, commentsCount: old.commentsCount + 1 } : old,
      );
    },
  });
}

export function useCreateReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FormData | { formData: FormData; signal?: AbortSignal }) => {
      const formData = payload instanceof FormData ? payload : payload.formData;
      const signal = payload instanceof FormData ? undefined : payload.signal;
      const body = await prepareDirectUploadForm(apiClient, formData, 'reel', { signal });
      const { data } = await apiClient.post<ReelItem>('/reels', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        ...(signal ? { signal } : {}),
      });
      return data;
    },
    onSuccess: (newReel) => {
      queryClient.setQueriesData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
        { queryKey: [REELS_FEED_KEY] },
        (old) => {
          if (!old || old.pages.length === 0) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                data: [newReel, ...old.pages[0].data],
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: [REELS_FEED_KEY] });
    },
  });
}

export function useNotInterestedReel() {
  return useMutation({
    mutationFn: async (reelId: string) => {
      const { data } = await apiClient.post<{ success: boolean }>(
        `/reels/${reelId}/not-interested`,
      );
      if (!data.success) throw new Error('Could not update your preference');
      return { reelId, ...data };
    },
  });
}

export function useReportReel() {
  return useMutation({
    mutationFn: async ({
      reelId,
      category,
      details,
    }: {
      reelId: string;
      category: string;
      details?: string;
    }) => {
      const { data } = await apiClient.post<{ success: boolean; message: string }>(
        `/reels/${reelId}/report`,
        { category, details },
      );
      if (!data.success) throw new Error('Could not submit your report');
      return data;
    },
  });
}
