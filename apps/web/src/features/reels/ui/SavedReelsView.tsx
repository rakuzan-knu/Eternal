import { useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSavedReels } from '../api/reelsApi';
import { ReelGrid } from './ReelGrid';

export function SavedReelsView({ userId }: { userId: string }) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const query = useSavedReels(userId, cursors[cursors.length - 1]);
  const nextCursor = query.data?.meta.nextCursor;
  const buttonClass =
    'inline-flex min-h-11 items-center justify-center gap-2 px-4 rounded-xl border border-black/10 dark:border-white/10 text-sm font-semibold cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <section
      aria-labelledby="saved-reels-heading"
      className="space-y-4 text-gray-900 dark:text-white"
    >
      <div className="flex items-center gap-3">
        <span className="size-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
          <Bookmark size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 id="saved-reels-heading" className="text-lg font-bold">
            Saved reels
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your private video collection, synced to your account.
          </p>
        </div>
      </div>
      {query.isPending ? (
        <p role="status" className="py-8 text-sm text-gray-500">
          Loading saved reels…
        </p>
      ) : query.isError ? (
        <div role="alert" className="rounded-2xl border border-red-500/20 p-5 space-y-3">
          <p className="text-sm">Saved reels could not be loaded. Try again.</p>
          <button type="button" className={buttonClass} onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : query.data.data.length ? (
        <ReelGrid reels={query.data.data} />
      ) : (
        <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 py-8 px-5 text-center space-y-3">
          <Film size={28} aria-hidden="true" className="mx-auto text-purple-400" />
          <p className="font-semibold">
            {cursors.length > 1
              ? 'No more saved reels on this page'
              : 'Keep the reels you want to revisit'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tap the bookmark on a reel to find it here.
          </p>
          <Link to="/reels" className={buttonClass}>
            Explore reels
          </Link>
        </div>
      )}
      {(cursors.length > 1 || query.data?.meta.hasNextPage) && (
        <nav aria-label="Saved reels pages" className="flex items-center justify-between gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={cursors.length === 1 || query.isFetching}
            onClick={() => setCursors((old) => old.slice(0, -1))}
          >
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </button>
          <span className="text-xs text-gray-500">Page {cursors.length}</span>
          <button
            type="button"
            className={buttonClass}
            disabled={!query.data?.meta.hasNextPage || !nextCursor || query.isFetching}
            onClick={() => {
              if (nextCursor) setCursors((old) => [...old, nextCursor]);
            }}
          >
            Next <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  );
}
