import { queryKeys } from '@/shared/api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users, Link2 } from 'lucide-react';
import { SEOHead } from '@/shared/seo';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { communitiesApi, useCommunityAction } from '@/features/communities';

export default function CommunityInvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    const previous = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    const meta = previous ?? document.createElement('meta');
    const content = meta.getAttribute('content');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    if (!previous) document.head.appendChild(meta);
    return () => {
      if (!previous) meta.remove();
      else if (content === null) meta.removeAttribute('content');
      else meta.content = content;
    };
  }, []);
  // Keep bearer invitation credentials out of persistent query keys and offline snapshots.
  const preview = useQuery({
    queryKey: queryKeys.communities.preview(token),
    meta: { persist: false },
    gcTime: 0,
    retry: false,
    queryFn: ({ signal }) => communitiesApi.preview(token, signal),
    enabled: Boolean(token),
  });
  const join = useCommunityAction(() => communitiesApi.join(token));
  const button =
    'inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <main className="min-h-[75dvh] flex items-center justify-center px-4 py-10">
      <SEOHead
        title="Community invitation • Eternal"
        description="Accept an invitation to an Eternal community."
        noindex
      />
      <div className="w-full max-w-lg rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-9 text-gray-900 dark:text-white text-center space-y-5">
        <Link to="/communities" className="text-sm text-purple-500 font-semibold">
          Eternal Communities
        </Link>
        <div className="mx-auto size-20 rounded-3xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
          <Users size={34} />
        </div>
        {preview.isPending ? (
          <p role="status">Checking invitation…</p>
        ) : preview.isError ? (
          <div role="alert" className="space-y-4">
            <h1 className="text-2xl font-bold">This invitation is unavailable</h1>
            <p className="text-sm text-gray-500">
              {axios.isAxiosError(preview.error) && preview.error.response?.status === 404
                ? 'It may have expired, reached its join limit or been revoked. Ask an admin for a new link.'
                : 'The invitation could not be checked. Check your connection and try again.'}
            </p>
            <button className={button} onClick={() => void preview.refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">You have been invited to</p>
            <h1 className="text-2xl font-bold break-words">{preview.data.community.name}</h1>
            <p className="text-sm text-gray-500 whitespace-pre-wrap break-words">
              {preview.data.community.description}
            </p>
            <p className="text-sm text-gray-500">
              {preview.data.community.memberCount.toLocaleString()} members · Access to every
              community channel
            </p>
            {authenticated ? (
              <button
                className={button}
                disabled={join.isPending}
                aria-busy={join.isPending}
                onClick={() =>
                  join.mutate(undefined, {
                    onSuccess: (result) =>
                      navigate(`/communities/${result.communityId}`, { replace: true }),
                  })
                }
              >
                <Link2 size={18} />
                {join.isPending ? 'Joining…' : 'Accept invitation'}
              </button>
            ) : (
              <Link className={button} to="/login" state={{ from: `/invite/${token}` }}>
                Sign in to accept
              </Link>
            )}
            {join.isError && (
              <p role="alert" className="text-sm text-red-500">
                You could not join. The invitation may no longer be valid, or your account may not
                have access. Try again or ask an admin.
              </p>
            )}
            <p className="text-xs text-gray-500">
              Your profile will be visible to other members after you join.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
