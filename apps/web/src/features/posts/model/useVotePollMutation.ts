import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import { FEED_KEY, USER_POSTS_KEY, SAVED_POSTS_KEY, POLL_VOTERS_KEY } from '@/shared/api/queryKeys';
import type { PostType, PollOptionResult } from '@/entities/post/model/types';
import { mapPostFeedData } from '@/entities/post/model/mapPostFeedData';
import { invalidatePostFeedHistory } from '@/entities/post/model/postFeedColdCache';

export function useVotePollMutation(postId: string | number, queryKey: unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => postsApi.votePoll(postId, optionId),
    onMutate: async (optionId: string) => {
      invalidatePostFeedHistory();
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<InfiniteData<FeedPage>>(queryKey);

      const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
        return mapPostFeedData(old, (p: PostType) => {
          if (p.id !== postId || !p.poll) return p;
          const prevVotedOptionId = p.poll.myVoteOptionId;
          if (prevVotedOptionId === optionId) return p;

          const isFirstVote = !prevVotedOptionId;
          const newTotalVotes = isFirstVote ? p.poll.totalVotes + 1 : p.poll.totalVotes;

          return {
            ...p,
            poll: {
              ...p.poll,
              myVoteOptionId: optionId,
              totalVotes: newTotalVotes,
              options: p.poll.options.map((o: PollOptionResult) => {
                let count = o.votes ?? o.votesCount ?? 0;
                if (prevVotedOptionId && o.id === prevVotedOptionId) {
                  count = Math.max(0, count - 1);
                }
                if (o.id === optionId) {
                  count = count + 1;
                }
                return { ...o, votes: count, votesCount: count };
              }),
            },
          };
        });
      };

      if (queryKey) {
        queryClient.setQueryData<InfiniteData<FeedPage>>(queryKey, updateFeedData);
      }
      queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [FEED_KEY] }, updateFeedData);
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [USER_POSTS_KEY] },
        updateFeedData,
      );
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: [SAVED_POSTS_KEY] },
        updateFeedData,
      );

      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && queryClient.setQueryData(queryKey, ctx.prev),
    onSettled: () => {
      invalidatePostFeedHistory();
      if (queryKey) queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: [USER_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SAVED_POSTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POLL_VOTERS_KEY, postId] });
    },
  });
}
