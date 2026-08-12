import { Check, X, Loader2, UserCheck } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import SlideOverPanel from '@/shared/ui/SlideOverPanel';
import { useFollowRequests, useRespondToFollowRequest } from '../../model/useFollowRequests';

interface FollowRequestsPanelProps {
  onClose: () => void;
}

export default function FollowRequestsPanel({ onClose }: FollowRequestsPanelProps) {
  const { data, isLoading } = useFollowRequests();
  const { accept, reject } = useRespondToFollowRequest();

  const requests = data?.data ?? [];
  const pendingId = accept.isPending
    ? accept.variables
    : reject.isPending
      ? reject.variables
      : undefined;

  return (
    <SlideOverPanel title="Follow requests" onClose={onClose}>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <span className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-500 mb-3">
            <UserCheck size={22} />
          </span>
          <p className="text-sm font-medium text-gray-300">No pending requests</p>
          <p className="mt-1 text-xs text-gray-500">
            When someone asks to follow you, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {requests.map((u) => {
            const busy = pendingId === u.id;
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors animate-fadeIn"
              >
                <Avatar src={u.avatar} size="md" alt={u.displayName ?? u.username} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {u.displayName ?? u.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                </div>
                <button
                  onClick={() => accept.mutate(u.id)}
                  disabled={busy}
                  aria-label="Accept"
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-all active:scale-90 disabled:opacity-40"
                >
                  {busy && accept.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={16} strokeWidth={3} />
                  )}
                </button>
                <button
                  onClick={() => reject.mutate(u.id)}
                  disabled={busy}
                  aria-label="Reject"
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all active:scale-90 disabled:opacity-40"
                >
                  {busy && reject.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SlideOverPanel>
  );
}
