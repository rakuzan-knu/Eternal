import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { ProfileMenu } from '../SidebarMenu';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';

describe('ProfileMenu & Account Management', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('user-1');
    useAccountsStore.setState({
      accounts: [
        {
          id: 'user-1',
          username: 'ayate',
          displayName: 'Ayate',
          avatar: 'https://example.com/avatar1.jpg',
          accessToken: 'token-1',
          refreshToken: 'refresh-1',
        },
        {
          id: 'user-2',
          username: 'bob',
          displayName: 'Bob',
          avatar: 'https://example.com/avatar2.jpg',
          accessToken: 'token-2',
          refreshToken: 'refresh-2',
        },
      ],
      activeAccountId: 'user-1',
    });
  });

  afterEach(() => {
    useAuthStore.getState().clearAuth();
    useAccountsStore.setState({ accounts: [], activeAccountId: null });
  });

  it('opens More menu and renders Change account and Log out', () => {
    renderWithProviders(<ProfileMenu isSidebarExpanded={true} />);

    const moreBtn = screen.getByRole('button', { name: /more/i });
    fireEvent.click(moreBtn);

    expect(screen.getByText('Change account')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('opens Log out confirmation modal when Log out is clicked and cancels properly', async () => {
    renderWithProviders(<ProfileMenu isSidebarExpanded={true} />);

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    fireEvent.click(screen.getByText('Log out'));

    expect(
      screen.getByText(
        'Are you sure you want to log out? You can sign back in or switch to another account at any time.',
      ),
    ).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByText(
          'Are you sure you want to log out? You can sign back in or switch to another account at any time.',
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('switches to remaining account on confirm logout when multiple accounts exist', async () => {
    renderWithProviders(<ProfileMenu isSidebarExpanded={true} />);

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    fireEvent.click(screen.getByText('Log out'));

    const confirmLogouts = screen.getAllByRole('button', { name: /log out/i });
    const modalConfirmBtn = confirmLogouts[confirmLogouts.length - 1];
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(useAccountsStore.getState().activeAccountId).toBe('user-2');
    });
  });

  it('opens Manage Accounts modal from Change account flyout', async () => {
    renderWithProviders(<ProfileMenu isSidebarExpanded={true} />);

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    fireEvent.click(screen.getByText('Change account'));

    const manageBtn = screen.getByText('Manage accounts');
    fireEvent.click(manageBtn);

    expect(screen.getByText('Account management')).toBeInTheDocument();
    expect(
      screen.getByText('Change your account, log in or out as often as you need.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Add account')).toBeInTheDocument();
  });
});
