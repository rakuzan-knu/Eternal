import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';

import type { PostType, PollOptionResult } from '@/entities/post/model/types';

export function useVotePollMutation(postId: string | number, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => postsApi.votePoll(postId, optionId),
    onMutate: async (optionId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<InfiniteData<FeedPage>>(queryKey);
      queryClient.setQueryData<InfiniteData<FeedPage>>(
        queryKey,
        (old: InfiniteData<FeedPage> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: FeedPage) => ({
              ...page,
              posts: page.posts.map((p: PostType) => {
                if (p.id !== postId || !p.poll) return p;
                return {
                  ...p,
                  poll: {
                    ...p.poll,
                    myVoteOptionId: optionId,
                    totalVotes: p.poll.totalVotes + 1,
                    options: p.poll.options.map((o: PollOptionResult) =>
                      o.id === optionId ? { ...o, votes: (o.votes ?? o.votesCount ?? 0) + 1 } : o,
                    ),
                  },
                };
              }),
            })),
          };
        },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && queryClient.setQueryData(queryKey, ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
