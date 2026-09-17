import { useQuery } from '@tanstack/react-query';
import { postsApi } from '../api/postsApi';
import { POLL_VOTERS_KEY } from '@/shared/api/queryKeys';

export interface PollVoterGroup {
  optionId: string;
  voters: { id: string; username: string; displayName?: string; avatar?: string | null }[];
}

export function usePollVoters(postId: string | number) {
  return useQuery<PollVoterGroup[]>({
    queryKey: [POLL_VOTERS_KEY, postId],
    queryFn: () => postsApi.getPollVoters(postId),
  });
}
