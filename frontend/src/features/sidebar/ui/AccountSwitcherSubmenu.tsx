import React from 'react';
import { Users } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { HoverFlyout } from './HoverFlyout';
import { MenuItem } from './MenuItem';

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
      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {accounts.map((account) => {
          const avatarUrl =
            (account.id === currentUser?.id ? currentUser.avatar : account.avatar) ??
            account.avatar ??
            undefined;

          return (
            <button
              key={account.id}
              type="button"
              onClick={() => account.id !== activeAccountId && onSwitchAccount(account.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                account.id === activeAccountId ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <Avatar size="sm" src={avatarUrl} />
              <span className="flex-1 text-left truncate text-gray-200">
                {account.displayName || account.username}
              </span>
              {account.id === activeAccountId && (
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-white/10 my-2" />

      <button
        type="button"
        onClick={onOpenManageAccounts}
        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
      >
        Manage accounts
      </button>
    </HoverFlyout>
  );
}
