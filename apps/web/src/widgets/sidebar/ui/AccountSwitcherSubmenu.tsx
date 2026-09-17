import React, { useState } from 'react';
import { Users } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { MenuItem } from './MenuItem';

interface AccountSwitcherMenuItemProps {
  onSwitchAccount: (id: string) => void;
  onOpenManageAccounts: () => void;
}

export function AccountSwitcherMenuItem({
  onSwitchAccount,
  onOpenManageAccounts,
}: AccountSwitcherMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const accounts = useAccountsStore((s) => s.accounts);
  const activeAccountId = useAccountsStore((s) => s.activeAccountId);
  const { data: currentUser } = useCurrentUser();

  return (
    <div className="flex flex-col">
      <MenuItem
        icon={Users}
        label="Change account"
        hasChevron
        onClick={() => setIsOpen((v) => !v)}
      />

      {isOpen && (
        <div className="flex flex-col gap-1 pl-2 pr-1 py-2 my-1 bg-white/[0.04] border border-white/5 rounded-xl animate-menuIn">
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
            {accounts.map((account) => {
              const avatarUrl =
                (account.id === currentUser?.id ? currentUser.avatar : account.avatar) ??
                account.avatar ??
                undefined;
              const isActive = account.id === activeAccountId;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => !isActive && onSwitchAccount(account.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-purple-500/20 text-white font-medium border border-purple-500/30'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Avatar size="sm" src={avatarUrl} />
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <span className="truncate font-medium text-sm">
                      {account.displayName || account.username}
                    </span>
                    <span className="text-[11px] text-gray-400 truncate">@{account.username}</span>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-white/10 my-1" />

          <button
            type="button"
            onClick={onOpenManageAccounts}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-colors cursor-pointer"
          >
            Manage accounts
          </button>
        </div>
      )}
    </div>
  );
}
