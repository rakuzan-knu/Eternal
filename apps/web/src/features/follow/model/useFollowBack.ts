import { useMutation } from '@tanstack/react-query';
import { useNotificationStore } from '@/entities/notification';
import { followApi } from '../api/followApi';

export function useFollowBack() {
  const optimisticFollows = useNotificationStore((state) => state.optimisticFollows);
  const setOptimisticFollow = useNotificationStore((state) => state.setOptimisticFollow);

  const followMutation = useMutation({
    mutationFn: async ({
      userId,
      isCurrentlyFollowing,
    }: {
      userId: string;
      isCurrentlyFollowing: boolean;
    }) => {
      if (isCurrentlyFollowing) {
        await followApi.unfollow(userId);
      } else {
        await followApi.follow(userId);
      }
    },
    onMutate: ({ userId, isCurrentlyFollowing }) => {
      setOptimisticFollow(userId, !isCurrentlyFollowing, true);
    },
    onSuccess: (_, { userId, isCurrentlyFollowing }) => {
      setOptimisticFollow(userId, !isCurrentlyFollowing, false);
    },
    onError: (_, { userId, isCurrentlyFollowing }) => {
      setOptimisticFollow(userId, isCurrentlyFollowing, false);
    },
  });

  const toggleFollow = (userId: string, isCurrentlyFollowing: boolean) => {
    const current = optimisticFollows[userId];
    if (current?.isLoading) return;
    const targetState = current !== undefined ? current.isFollowing : isCurrentlyFollowing;
    followMutation.mutate({ userId, isCurrentlyFollowing: targetState });
  };

  return {
    toggleFollow,
    isFollowing: (userId: string, defaultFollowing = false) =>
      optimisticFollows[userId]?.isFollowing ?? defaultFollowing,
    isLoading: (userId: string) => Boolean(optimisticFollows[userId]?.isLoading),
  };
}
