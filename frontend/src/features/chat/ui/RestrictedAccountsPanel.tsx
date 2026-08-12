import React, { useState } from 'react';
import { ArrowLeft, UserPlus, UserX, Loader2 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { useBlockedUsers } from '../model/useBlockedUsers';
import { useUnblockUser } from '../model/useConversationMutations';
import BlockUserModal from './BlockUserModal';

interface RestrictedAccountsPanelProps {
  onClose: () => void;
}

export default function RestrictedAccountsPanel({ onClose }: RestrictedAccountsPanelProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isBlockModalOpen, setBlockModalOpen] = useState(false);

  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockUser = useUnblockUser();

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col bg-[#16161a]/95 backdrop-blur-2xl ${
        isClosing ? 'animate-slideOutLeft' : 'animate-slideInLeft'
      }`}
    >
      <div className="flex items-center gap-2 px-4 h-16 flex-shrink-0 border-b border-white/5">
        <button
          onClick={requestClose}
          aria-label="Back"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-white">Restricted accounts</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
        <button
          onClick={() => setBlockModalOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-200">
            <UserPlus size={18} />
          </span>
          Block someone new
        </button>

        <div className="mt-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Blocked accounts
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !blockedUsers || blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-500 mb-3">
              <UserX size={22} />
            </span>
            <p className="text-sm font-medium text-gray-300">No blocked accounts</p>
            <p className="mt-1 text-xs text-gray-500">
              People you block won&apos;t be able to message you or see your activity.
            </p>
          </div>
        ) : (
          <ul className="mt-1 flex flex-col">
            {blockedUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5"
              >
                <Avatar src={u.avatar} size="md" alt={u.displayName ?? u.username} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {u.displayName ?? u.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                </div>
                <button
                  onClick={() => unblockUser.mutate(u.id)}
                  disabled={unblockUser.isPending && unblockUser.variables === u.id}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors active:scale-95 disabled:opacity-50"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isBlockModalOpen && <BlockUserModal onClose={() => setBlockModalOpen(false)} />}
    </div>
  );
}
