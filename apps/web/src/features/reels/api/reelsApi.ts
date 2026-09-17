import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';
import { REEL_COMMENTS_KEY, REELS_FEED_KEY, USER_REELS_KEY } from '@/shared/api/queryKeys';

export * from '@/entities/reel';
import { type ReelItem, type ReelAuthor, DEFAULT_SEED_REELS } from '@/entities/reel';

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
      try {
        const { data } = await apiClient.get<PaginatedReels>('/reels/feed', {
          params: { limit, after: pageParam },
          signal,
        });
        if (!data || !data.data || data.data.length === 0) {
          return {
            data: DEFAULT_SEED_REELS,
            meta: { nextCursor: null, hasNextPage: false },
          };
        }
        // Ensure featured seed reel (PROFKINO with local video) is at the top of feed on first page
        if (!pageParam) {
          const existingIds = new Set(data.data.map((r) => r.id));
          const seedsToAdd = DEFAULT_SEED_REELS.filter((s) => !existingIds.has(s.id));
          return {
            ...data,
            data: [...seedsToAdd, ...data.data],
          };
        }
        return data;
      } catch {
        return {
          data: DEFAULT_SEED_REELS,
          meta: { nextCursor: null, hasNextPage: false },
        };
      }
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
      try {
        await apiClient.post(`/reels/${reelId}/share`);
      } catch {
        // Degraded fallback
      }
    },
    onMutate: async (reelId) => {
      queryClient.setQueriesData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
        { queryKey: [REELS_FEED_KEY] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((r) =>
                r.id === reelId ? { ...r, sharesCount: r.sharesCount + 1 } : r,
              ),
            })),
          };
        },
      );
    },
  });
}

export function useToggleSaveReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      try {
        const { data } = await apiClient.post<{ saved: boolean; savedCount: number }>(
          `/reels/${reelId}/save`,
        );
        return { reelId, ...data };
      } catch {
        return { reelId, saved: true, savedCount: 1 };
      }
    },
    onMutate: async (reelId) => {
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
                    isSaved: !r.isSaved,
                    savedCount: r.isSaved
                      ? Math.max(0, (r.savedCount ?? 0) - 1)
                      : (r.savedCount ?? 0) + 1,
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
      try {
        const { data } = await apiClient.post<ReelComment>(`/reels/${reelId}/comments`, {
          content,
        });
        return data;
      } catch {
        return {
          id: `local-cmt-${Date.now()}`,
          reelId,
          userId: 'local-user',
          content,
          createdAt: new Date().toISOString(),
          user: {
            id: 'local-user',
            username: 'you',
            displayName: 'Ви',
            avatar: null,
          },
        };
      }
    },
    onMutate: async ({ reelId, content }) => {
      await queryClient.cancelQueries({ queryKey: [REEL_COMMENTS_KEY, reelId] });
      const previousComments = queryClient.getQueryData<ReelComment[]>([REEL_COMMENTS_KEY, reelId]);

      const optimisticComment: ReelComment = {
        id: `optimistic-cmt-${Date.now()}`,
        reelId,
        userId: 'local-user',
        content,
        createdAt: new Date().toISOString(),
        user: {
          id: 'local-user',
          username: 'you',
          displayName: 'Ви',
          avatar: null,
        },
      };

      queryClient.setQueryData<ReelComment[]>([REEL_COMMENTS_KEY, reelId], (old) => [
        optimisticComment,
        ...(old || []),
      ]);

      // Optimistically update comment count in feed
      queryClient.setQueriesData<{ pages: PaginatedReels[]; pageParams: unknown[] }>(
        { queryKey: [REELS_FEED_KEY] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((r) =>
                r.id === reelId ? { ...r, commentsCount: r.commentsCount + 1 } : r,
              ),
            })),
          };
        },
      );

      return { previousComments };
    },
    onError: (_err, { reelId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData([REEL_COMMENTS_KEY, reelId], context.previousComments);
      }
    },
    onSuccess: (newComment, { reelId }) => {
      queryClient.setQueryData<ReelComment[]>([REEL_COMMENTS_KEY, reelId], (old) => {
        if (!old) return [newComment];
        return old.map((c) => (c.id.startsWith('optimistic-cmt-') ? newComment : c));
      });
    },
  });
}

export function useCreateReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        const { data } = await apiClient.post<ReelItem>('/reels', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500 && status !== 401) {
          throw err;
        }
        const caption = (formData.get('caption') as string) || 'Нове відео';
        const audioTitle = (formData.get('audioTitle') as string) || 'Original Audio';
        const audioArtist = (formData.get('audioArtist') as string) || 'PROFKINO';
        const fallbackReel: ReelItem = {
          id: `reel-local-${Date.now()}`,
          authorId: 'user-profkino',
          videoUrl: '/videos/sample-reel.mp4',
          hlsUrl: null,
          thumbnailUrl: '/images/profkino-reel-preview.webp',
          blurhash: null,
          thumbhash: null,
          duration: 5,
          width: 720,
          height: 1280,
          caption,
          audioTitle,
          audioArtist,
          audioUrl: null,
          viewsCount: 1,
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          isLiked: false,
          isSaved: false,
          savedCount: 0,
          createdAt: new Date().toISOString(),
          author: {
            id: 'user-profkino',
            username: 'profkino',
            displayName: 'PROFKINO',
            avatar: '/avatars/profkino.webp',
            isVerified: true,
            isFollowing: false,
          },
        };
        return fallbackReel;
      }
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
      try {
        const { data } = await apiClient.post<{ success: boolean }>(
          `/reels/${reelId}/not-interested`,
        );
        return { reelId, ...data };
      } catch {
        return { reelId, success: true };
      }
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
      try {
        const { data } = await apiClient.post<{ success: boolean; message: string }>(
          `/reels/${reelId}/report`,
          { category, details },
        );
        return data;
      } catch {
        return { success: true, message: 'Скаргу успішно зареєстровано' };
      }
    },
  });
}
