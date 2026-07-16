import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';

export function useVotePollMutation(postId: string | number, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => postsApi.votePoll(postId, optionId),
    onMutate: async (optionId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<InfiniteData<FeedPage>>(queryKey);
      queryClient.setQueryData<InfiniteData<FeedPage>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => {
              if (p.id !== postId || !p.poll) return p;
              return {
                ...p,
                poll: {
                  ...p.poll,
                  myVoteOptionId: optionId,
                  totalVotes: p.poll.totalVotes + 1,
                  options: p.poll.options.map((o) =>
                    o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
                  ),
                },
              };
            }),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && queryClient.setQueryData(queryKey, ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
