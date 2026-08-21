import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { AccountSwitcherMenuItem } from '../AccountSwitcherSubmenu';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import React from 'react';

describe('AccountSwitcherMenuItem', () => {
  beforeEach(() => {
    useAccountsStore.setState({
      accounts: [
        {
          id: 'acc-1',
          username: 'acc1',
          displayName: 'Account One',
          avatar: null,
          accessToken: 'a1',
          refreshToken: 'r1',
        },
        {
          id: 'acc-2',
          username: 'acc2',
          displayName: 'Account Two',
          avatar: null,
          accessToken: 'a2',
          refreshToken: 'r2',
        },
      ],
      activeAccountId: 'acc-1',
    });
  });

  it('renders menu item, opens submenu on click, and switches account', () => {
    const onSwitch = vi.fn();
    const onManage = vi.fn();

    renderWithProviders(
      <AccountSwitcherMenuItem onSwitchAccount={onSwitch} onOpenManageAccounts={onManage} />,
    );

    const trigger = screen.getByRole('button', { name: /change account/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Account Two')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Account Two'));
    expect(onSwitch).toHaveBeenCalledWith('acc-2');

    const manageBtn = screen.getByRole('button', { name: /manage accounts/i });
    fireEvent.click(manageBtn);
    expect(onManage).toHaveBeenCalled();
  });
});
