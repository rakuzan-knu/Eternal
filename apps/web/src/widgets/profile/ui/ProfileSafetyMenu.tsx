import { useId, useRef, useState } from 'react';
import { Flag, MoreHorizontal, ShieldBan } from 'lucide-react';
import { useUserBlockStatus } from '@/entities/chat';
import { useBlockUser, useUnblockUser, ReportConversationModal } from '@/features/chat';
import DropdownMenu from '@/shared/ui/DropdownMenu';
import Modal from '@/shared/ui/Modal';

export function ProfileSafetyMenu({ userId, username }: { userId: string; username: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<'block' | 'report' | null>(null);
  const [error, setError] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { blockedByMe } = useUserBlockStatus(userId);
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const mutation = blockedByMe ? unblock : block;
  const close = () => {
    if (!mutation.isPending) {
      setDialog(null);
      setError(false);
    }
  };
  const open = (next: 'block' | 'report') => {
    triggerRef.current?.focus();
    setMenuOpen(false);
    setError(false);
    setDialog(next);
  };
  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Actions for @${username}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((old) => !old)}
          className="flex size-11 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 cursor-pointer"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>
        {menuOpen && (
          <DropdownMenu
            align="right"
            aria-label="Profile actions"
            onClose={() => setMenuOpen(false)}
            items={[
              {
                key: 'report',
                label: 'Report profile',
                icon: <Flag size={16} />,
                onClick: () => open('report'),
              },
              {
                key: 'block',
                label: blockedByMe ? 'Unblock account' : 'Block account',
                icon: <ShieldBan size={16} />,
                danger: !blockedByMe,
                onClick: () => open('block'),
              },
            ]}
          />
        )}
      </div>
      {dialog === 'report' && (
        <ReportConversationModal
          key={userId}
          userId={userId}
          context="profile"
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'block' && (
        <Modal onClose={close} aria-labelledby={titleId}>
          {() => (
            <div className="w-full max-w-md p-6 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl text-gray-900 dark:text-white">
              <h2 id={titleId} className="text-lg font-bold">
                {blockedByMe ? 'Unblock' : 'Block'} @{username}?
              </h2>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {blockedByMe
                  ? 'This removes the account from your blocked list.'
                  : 'This adds the account to your blocked list. You can unblock it in Security settings.'}
              </p>
              {error && (
                <p role="alert" className="mt-3 text-sm text-red-500">
                  Could not update this account. Try again.
                </p>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  autoFocus
                  disabled={mutation.isPending}
                  onClick={close}
                  className="min-h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  aria-busy={mutation.isPending}
                  onClick={() => {
                    setError(false);
                    mutation.mutate(userId, {
                      onSuccess: () => setDialog(null),
                      onError: () => setError(true),
                    });
                  }}
                  className="min-h-11 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  {mutation.isPending
                    ? 'Updating…'
                    : blockedByMe
                      ? 'Unblock account'
                      : 'Block account'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
