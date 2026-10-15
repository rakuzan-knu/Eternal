import React, { useState } from 'react';
import { UserPlus, UserX, Loader2 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import SlideOverPanel from '../../../shared/ui/SlideOverPanel';
import { useBlockedUsers } from '../model/useBlockedUsers';
import { useUnblockUser } from '../model/useConversationMutations';
import BlockUserModal from './BlockUserModal';

import type { UserSnapshot } from '../../../entities/chat/model/types';

interface RestrictedAccountsPanelProps {
  onClose: () => void;
}

export default function RestrictedAccountsPanel({ onClose }: RestrictedAccountsPanelProps) {
  const [isBlockModalOpen, setBlockModalOpen] = useState(false);

  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockUser = useUnblockUser();

  return (
    <SlideOverPanel title="Restricted accounts" onClose={onClose}>
      <button
        type="button"
        onClick={() => setBlockModalOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-950 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-950 dark:text-white">
          <UserPlus size={18} />
        </span>
        Block someone new
      </button>

      <div className="mt-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Blocked accounts
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : !blockedUsers || blockedUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <span className="w-12 h-12 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-400 dark:text-gray-500 mb-3">
            <UserX size={22} />
          </span>
          <p className="text-sm font-medium text-gray-950 dark:text-white">No blocked accounts</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            People you block won&apos;t be able to message you or see your activity.
          </p>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {blockedUsers.map((u: UserSnapshot) => (
            <li
              key={u.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Avatar
                src={u.avatar}
                size="md"
                alt={u.displayName ?? u.username}
                decoration={u.activeDecoration}
                userId={u.id}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-950 dark:text-white truncate">
                  {u.displayName ?? u.username}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">@{u.username}</p>
              </div>
              <button
                type="button"
                onClick={() => unblockUser.mutate(u.id)}
                disabled={unblockUser.isPending && unblockUser.variables === u.id}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-950 dark:text-white bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}

      {isBlockModalOpen && <BlockUserModal onClose={() => setBlockModalOpen(false)} />}
    </SlideOverPanel>
  );
}
