import React from 'react';
import { Ban } from 'lucide-react';
import { useUnblockUser } from '../model/useConversationMutations';

interface BlockedComposerBannerProps {
  otherUserId: string;
  blockedByMe: boolean;
  blockingMe: boolean;
}

export default function BlockedComposerBanner({
  otherUserId,
  blockedByMe,
  blockingMe,
}: BlockedComposerBannerProps) {
  const unblockUser = useUnblockUser();

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white/5 backdrop-blur-2xl border-t border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 flex-shrink-0">
          <Ban size={16} />
        </span>
        <p className="text-sm text-gray-300 min-w-0">
          {blockedByMe
            ? 'You blocked this user. You can no longer message each other.'
            : "You can't reply to this conversation."}
        </p>
      </div>

      {blockedByMe && !blockingMe && (
        <button
          onClick={() => unblockUser.mutate(otherUserId)}
          disabled={unblockUser.isPending}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors active:scale-95 disabled:opacity-50"
        >
          {unblockUser.isPending ? 'Unblocking…' : 'Unblock'}
        </button>
      )}
    </div>
  );
}
