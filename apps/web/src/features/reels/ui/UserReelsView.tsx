import React from 'react';
import { Film } from 'lucide-react';
import { useUserReels } from '../api/reelsApi';
import { ReelGrid } from './ReelGrid';

interface UserReelsViewProps {
  userId: string;
}

export const UserReelsView: React.FC<UserReelsViewProps> = ({ userId }) => {
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useUserReels(userId);

  const reels = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-4" role="status" aria-label="Loading reels">
        <span className="sr-only">Loading reels...</span>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="skeleton-shimmer aspect-9/16 rounded-2xl border border-white/5"
          />
        ))}
      </div>
    );
  }

  if (isError && reels.length === 0) {
    return (
      <div role="alert" className="rounded-2xl border border-red-500/20 p-6 text-center space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300">Reels could not be loaded.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-11 px-4 rounded-xl border border-purple-500/30 text-purple-500 font-semibold cursor-pointer hover:bg-purple-500/10"
        >
          Try again
        </button>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-4xl bg-white/1">
        <Film className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-gray-400 font-medium text-base">No reels published yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Short videos uploaded by this user will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReelGrid reels={reels} />
      {isError && (
        <p role="alert" className="text-sm text-red-400">
          More reels could not be loaded. You can try again.
        </p>
      )}
      {hasNextPage && (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          className="w-full min-h-11 rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold text-sm cursor-pointer hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFetchingNextPage ? 'Loading…' : isError ? 'Try loading more again' : 'Load more reels'}
        </button>
      )}
    </div>
  );
};
