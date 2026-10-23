import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Compass, Plus, Search, Users, X } from 'lucide-react';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { SEOHead } from '@/shared/seo';
import { useCommunityDirectory, useMyCommunities } from '@/features/communities';
import { CommunityCreateDialog, CommunityJoinDialog } from '@/widgets/communities';
import type { CommunitySummary } from '@social-network/shared-contracts';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent-color)]';
const button = `min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-current/15 px-4 text-sm font-semibold cursor-pointer hover:bg-[var(--app-surface-elevated)] ${focus} disabled:opacity-50 disabled:cursor-not-allowed`;

function CommunityIdentity({ community }: { community: CommunitySummary }) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  return (
    <span
      aria-hidden="true"
      className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-current/10 bg-[var(--app-surface-elevated)] text-lg font-bold"
    >
      {community.avatar && failedAvatar !== community.avatar ? (
        <img
          src={community.avatar}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedAvatar(community.avatar)}
        />
      ) : (
        community.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => Array.from(word)[0])
          .join('')
          .toLocaleUpperCase()
      )}
    </span>
  );
}

function MemberCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--app-text-secondary)]">
      <Users size={14} aria-hidden="true" />
      {count.toLocaleString()} {count === 1 ? 'member' : 'members'}
    </span>
  );
}

function CommunityCard({ community }: { community: CommunitySummary }) {
  return (
    <Link
      to={`/communities/${community.id}`}
      className={`group flex min-w-0 flex-col gap-4 rounded-2xl border border-current/10 bg-[var(--app-surface-card)] p-5 hover:border-[var(--app-accent-color)] ${focus}`}
    >
      <div className="flex items-center gap-3">
        <CommunityIdentity community={community} />
        <h3 className="min-w-0 break-words text-base font-bold leading-snug">{community.name}</h3>
      </div>
      <p className="line-clamp-3 min-h-15 text-sm leading-5 text-[var(--app-text-secondary)]">
        {community.description || 'A community on Eternal. Open its profile to learn more.'}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-4">
        <MemberCount count={community.memberCount} />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--app-accent-color)]">
          Open community <ArrowRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default function CommunitiesPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [draft, setDraft] = useState({ query, value: query });
  const search = draft.query === query ? draft.value : query;
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composing = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const navigate = useNavigate();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const [paging, setPaging] = useState<{ query: string; cursors: (string | undefined)[] }>({
    query: '',
    cursors: [undefined],
  });
  const cursors = paging.query === query ? paging.cursors : [undefined];
  const directory = useCommunityDirectory(query, cursors[cursors.length - 1]);
  const [mineCursors, setMineCursors] = useState<(string | undefined)[]>([undefined]);
  const mine = useMyCommunities(authenticated, mineCursors[mineCursors.length - 1]);

  useEffect(() => {
    // URL navigation and unmount both cancel any pending search from the old page.
    return () => clearTimeout(timer.current);
  }, [query]);

  function commitSearch(value: string) {
    clearTimeout(timer.current);
    const nextQuery = value.trim();
    setDraft({ query: nextQuery, value });
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (nextQuery) next.set('q', nextQuery);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }

  function queueSearch(value: string) {
    clearTimeout(timer.current);
    if (!composing.current) timer.current = setTimeout(() => commitSearch(value), 300);
  }

  function clearSearch() {
    composing.current = false;
    commitSearch('');
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 text-[var(--app-text-primary)] sm:px-6">
      <SEOHead
        title="Communities • Eternal"
        description="Discover communities on Eternal. Meet your people and join by invitation."
        canonical="/communities"
      />
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-surface-elevated)] text-[var(--app-accent-color)] sm:flex">
            <Compass size={23} aria-hidden="true" />
          </span>
          <div>
            <Link
              to="/"
              className={`text-xs font-semibold text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] ${focus}`}
            >
              Eternal / Communities
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Find your people.
            </h1>
          </div>
        </div>
        {authenticated ? (
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => setJoinOpen(true)}>
              Join with a link
            </button>
            <button
              className={`${button} text-[var(--app-accent-color)]`}
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={18} aria-hidden="true" />
              Create community
            </button>
          </div>
        ) : (
          <Link to="/login" state={{ from: '/communities' }} className={button}>
            Sign in to create
          </Link>
        )}
      </header>

      <form
        role="search"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing.current) commitSearch(search);
        }}
        className="space-y-2"
      >
        <label htmlFor="community-search" className="block text-sm font-semibold">
          Search communities
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-current/15 bg-[var(--app-surface-card)] px-3 focus-within:border-[var(--app-accent-color)] sm:gap-3 sm:px-4">
          <Search
            size={20}
            aria-hidden="true"
            className="shrink-0 text-[var(--app-text-secondary)]"
          />
          <input
            ref={inputRef}
            id="community-search"
            type="search"
            placeholder="Search by name or topic"
            value={search}
            maxLength={100}
            onChange={(event) => {
              setDraft({ query, value: event.target.value });
              queueSearch(event.target.value);
            }}
            onCompositionStart={() => {
              composing.current = true;
              clearTimeout(timer.current);
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              queueSearch(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing))
                event.preventDefault();
            }}
            className="min-h-15 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[var(--app-text-secondary)] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
              className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-elevated)] ${focus}`}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
          <button className={`${button} my-2 px-3`} type="submit">
            Search
          </button>
        </div>
      </form>

      {authenticated && (
        <section aria-label="Your communities" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Your communities</h2>
            <p className="text-xs text-[var(--app-text-secondary)]">Pick up where you left off</p>
          </div>
          {mine.isPending && (
            <p role="status" className="py-4 text-sm text-[var(--app-text-secondary)]">
              Loading your communities…
            </p>
          )}
          {mine.isError && (
            <p role="alert" className="text-sm text-red-500">
              Your communities could not be loaded.{' '}
              <button
                className={`cursor-pointer underline ${focus}`}
                onClick={() => void mine.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          {mine.data?.data.length === 0 && (
            <div className="rounded-2xl border border-dashed border-current/15 p-5 text-sm text-[var(--app-text-secondary)]">
              Create a community or open an invitation from someone you know.
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {mine.data?.data.map((community) => (
              <Link
                key={community.id}
                to={`/communities/${community.id}`}
                className={`group flex min-w-0 items-center gap-3 rounded-2xl border border-current/10 bg-[var(--app-surface-card)] p-3 hover:border-[var(--app-accent-color)] ${focus}`}
              >
                <CommunityIdentity community={community} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{community.name}</h3>
                  <MemberCount count={community.memberCount} />
                </div>
                <ArrowRight
                  size={17}
                  aria-hidden="true"
                  className="shrink-0 text-[var(--app-text-secondary)] group-hover:text-[var(--app-accent-color)]"
                />
              </Link>
            ))}
          </div>
          {(mineCursors.length > 1 || mine.data?.nextCursor) && (
            <nav aria-label="Your communities pages" className="flex gap-3">
              <button
                className={button}
                disabled={mineCursors.length === 1 || mine.isFetching}
                onClick={() => setMineCursors((previous) => previous.slice(0, -1))}
              >
                Previous
              </button>
              <button
                className={button}
                disabled={!mine.data?.nextCursor || mine.isFetching}
                onClick={() => {
                  const cursor = mine.data?.nextCursor;
                  if (cursor) setMineCursors((previous) => [...previous, cursor]);
                }}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      )}

      <section
        aria-label="Discover communities"
        className="space-y-4"
        aria-busy={directory.isFetching}
      >
        <div className="space-y-1 border-t border-current/10 pt-6">
          <h2 className="text-lg font-bold">
            {query ? `Results for “${query}”` : 'Discover communities'}
          </h2>
          <p className="text-sm text-[var(--app-text-secondary)]">
            Explore public profiles. You’ll need an invitation to join the conversation.
          </p>
        </div>
        {directory.isPending ? (
          <p role="status" className="py-12 text-center text-[var(--app-text-secondary)]">
            Finding communities…
          </p>
        ) : directory.isError ? (
          <div role="alert" className="space-y-3 rounded-2xl border border-red-500/20 p-6">
            <p>Communities could not be loaded.</p>
            <button className={button} onClick={() => void directory.refetch()}>
              Try again
            </button>
          </div>
        ) : directory.data.data.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {directory.data.data.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-dashed border-current/15 p-8 text-center">
            <Users
              size={28}
              aria-hidden="true"
              className="mx-auto text-[var(--app-text-secondary)]"
            />
            <h3 className="text-lg font-semibold">
              {query ? 'No communities match this search' : 'The next community could be yours'}
            </h3>
            <p className="text-sm text-[var(--app-text-secondary)]">
              {query
                ? 'Try a different name or topic.'
                : 'Create a home for your friends, games or creative projects.'}
            </p>
            {query && (
              <button className={button} onClick={clearSearch}>
                Clear search
              </button>
            )}
          </div>
        )}
        {(cursors.length > 1 || directory.data?.nextCursor) && (
          <nav aria-label="Community pages" className="flex items-center justify-between gap-4">
            <button
              className={button}
              disabled={cursors.length === 1 || directory.isFetching}
              onClick={() => setPaging({ query, cursors: cursors.slice(0, -1) })}
            >
              Previous
            </button>
            <span className="text-sm text-[var(--app-text-secondary)]">Page {cursors.length}</span>
            <button
              className={button}
              disabled={!directory.data?.nextCursor || directory.isFetching}
              onClick={() => {
                if (directory.data?.nextCursor)
                  setPaging({ query, cursors: [...cursors, directory.data.nextCursor] });
              }}
            >
              Next
            </button>
          </nav>
        )}
      </section>
      {joinOpen && <CommunityJoinDialog onClose={() => setJoinOpen(false)} />}
      {createOpen && (
        <CommunityCreateDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => navigate(`/communities/${id}`)}
        />
      )}
    </div>
  );
}
