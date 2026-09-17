import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { AccountSwitcherMenuItem } from './AccountSwitcherSubmenu';
import { useAccountsStore } from '@/shared/model/useAccountsStore';

function AccountSwitcherStoryWrapper() {
  useEffect(() => {
    useAccountsStore.setState({
      accounts: [
        {
          id: 'acc-1',
          username: 'elena',
          displayName: 'Elena Rostova',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          accessToken: 't1',
          refreshToken: 'r1',
        },
        {
          id: 'acc-2',
          username: 'marcus_dev',
          displayName: 'Marcus Dev',
          avatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
          accessToken: 't2',
          refreshToken: 'r2',
        },
      ],
      activeAccountId: 'acc-1',
    });
  }, []);

  return (
    <div className="w-[280px] p-4 bg-neutral-950 border border-neutral-800 rounded-2xl relative">
      <AccountSwitcherMenuItem
        onSwitchAccount={(id) => console.log('Switch to account:', id)}
        onOpenManageAccounts={() => console.log('Manage accounts clicked')}
      />
    </div>
  );
}

const meta: Meta<typeof AccountSwitcherMenuItem> = {
  title: 'Features/Sidebar/AccountSwitcherSubmenu',
  component: AccountSwitcherMenuItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof AccountSwitcherMenuItem>;

export const Default: Story = {
  render: () => <AccountSwitcherStoryWrapper />,
};
