import React from 'react';
import { Users } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { MenuItem } from './MenuItem';
import { HoverFlyout } from './HoverFlyout';

interface AccountSwitcherMenuItemProps {
  onSwitchAccount: (id: string) => void;
  onOpenManageAccounts: () => void;
}

export function AccountSwitcherMenuItem({
  onSwitchAccount,
  onOpenManageAccounts,
}: AccountSwitcherMenuItemProps) {
  const accounts = useAccountsStore((s) => s.accounts);
  const activeAccountId = useAccountsStore((s) => s.activeAccountId);
  const { data: currentUser } = useCurrentUser();

  return (
    <HoverFlyout
      trigger={({ toggle }) => (
        <MenuItem icon={Users} label="Change account" hasChevron onClick={toggle} />
      )}
    >
      <div className="flex flex-col gap-1 p-1">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none">
          Accounts
        </div>

        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-700 dark:text-white font-medium border border-purple-500/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Avatar
                  size="sm"
                  src={avatarUrl}
                  decoration={(account as any).activeDecoration}
                  userId={account.id}
                />
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="truncate font-medium text-sm">
                    {account.displayName || account.username}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    @{account.username}
                  </span>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="h-px bg-black/10 dark:bg-white/10 my-1" />

        <button
          type="button"
          onClick={onOpenManageAccounts}
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          Manage accounts
        </button>
      </div>
    </HoverFlyout>
  );
}
