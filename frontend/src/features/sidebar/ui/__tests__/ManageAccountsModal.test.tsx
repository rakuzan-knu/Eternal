import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ManageAccountsModal } from '../ManageAccountsModal';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { authApi } from '@/features/auth/api/authApi';
import React from 'react';

import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    logout: vi.fn(),
  },
}));

describe('ManageAccountsModal', () => {
  beforeEach(() => {
    useAccountsStore.setState({
      accounts: [
        {
          id: 'acc-1',
          username: 'user1',
          displayName: 'User One',
          avatar: null,
          accessToken: 'a1',
          refreshToken: 'r1',
        },
        {
          id: 'acc-2',
          username: 'user2',
          displayName: 'User Two',
          avatar: null,
          accessToken: 'a2',
          refreshToken: 'r2',
        },
      ],
      activeAccountId: 'acc-1',
    });
    vi.clearAllMocks();
  });

  it('renders accounts and allows switching and opening add account modal', () => {
    const onSwitch = vi.fn();
    const onAdd = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ManageAccountsModal onClose={onClose} onAddAccount={onAdd} onSwitchAccount={onSwitch} />,
    );

    expect(screen.getByText('Account management')).toBeInTheDocument();
    expect(screen.getByText('Active account')).toBeInTheDocument();

    const switchBtn = screen.getByText('User Two');
    fireEvent.click(switchBtn);
    expect(onSwitch).toHaveBeenCalledWith('acc-2');

    const addBtn = screen.getByRole('button', { name: 'Add account' });
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalled();
  });

  it('logs out of a secondary account', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined as never);

    renderWithProviders(
      <ManageAccountsModal onClose={vi.fn()} onAddAccount={vi.fn()} onSwitchAccount={vi.fn()} />,
    );

    const optionsButtons = screen.getAllByLabelText('Account options');
    fireEvent.click(optionsButtons[1]); // open menu for acc-2

    const logoutOption = screen.getByText('Log out of this account');
    fireEvent.click(logoutOption);

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledWith('r2');
      expect(useAccountsStore.getState().accounts.some((a) => a.id === 'acc-2')).toBe(false);
    });
  });
});
