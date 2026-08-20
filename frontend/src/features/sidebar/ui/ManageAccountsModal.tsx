import React, { useEffect, useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import Avatar from '@/shared/ui/Avatar';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { authApi } from '@/features/auth/api/authApi';

interface ManageAccountsModalProps {
  onClose: () => void;
  onAddAccount: () => void;
  onSwitchAccount: (id: string) => void;
}

export function ManageAccountsModal({
  onClose,
  onAddAccount,
  onSwitchAccount,
}: ManageAccountsModalProps) {
  const accounts = useAccountsStore((s) => s.accounts);
  const activeAccountId = useAccountsStore((s) => s.activeAccountId);
  const removeAccount = useAccountsStore((s) => s.removeAccount);
  const { data: currentUser } = useCurrentUser();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  const handleLogoutAccount = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    setOpenMenuId(null);
    if (!account) return;

    try {
      await authApi.logout(account.refreshToken);
    } catch {
      // Ignore
    }

    const wasActive = id === activeAccountId;
    removeAccount(id);

    if (wasActive) {
      const remainingAccounts = accounts.filter((a) => a.id !== id);
      if (remainingAccounts.length > 0) {
        onSwitchAccount(remainingAccounts[0].id);
      } else {
        useAuthStore.getState().clearAuth();
        onClose();
      }
    }
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Account management</h2>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Change your account, log in or out as often as you need.
          </p>

          <div className="flex flex-col gap-1">
            {accounts.map((account) => {
              const avatarUrl =
                (account.id === currentUser?.id ? currentUser.avatar : account.avatar) ??
                account.avatar ??
                undefined;

              return (
                <div
                  key={account.id}
                  className="relative flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => account.id !== activeAccountId && onSwitchAccount(account.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar size="sm" src={avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {account.displayName || account.username}
                      </p>
                      {account.id === activeAccountId && (
                        <p className="text-xs text-green-400 font-medium">Active account</p>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === account.id ? null : account.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    aria-label="Account options"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openMenuId === account.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-10 z-10 w-52 bg-[#1c1c20] border border-white/10 rounded-xl shadow-2xl py-1 animate-menuIn origin-top-right"
                    >
                      <button
                        type="button"
                        onClick={() => handleLogoutAccount(account.id)}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Log out of this account
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {accounts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">There are no saved accounts.</p>
            )}
          </div>

          <button
            type="button"
            onClick={onAddAccount}
            className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
          >
            Add account
          </button>
        </div>
      )}
    </Modal>
  );
}
