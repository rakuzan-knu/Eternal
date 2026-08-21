import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileMenu } from '../SidebarMenu';
import { BrowserRouter } from 'react-router-dom';
import { useUIStore } from '@/shared/model/useUIStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { authApi } from '@/features/auth/api/authApi';
import React from 'react';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'u1', username: 'testuser', displayName: 'Test User' },
  }),
}));

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    logout: vi.fn(),
  },
}));

describe('ProfileMenu', () => {
  beforeEach(() => {
    useUIStore.setState({ isEditProfileOpen: false });
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    useAccountsStore.setState({ accounts: [], activeAccountId: 'u1' });
    vi.clearAllMocks();
  });

  it('renders menu trigger button, toggles popup, and opens edit profile modal', () => {
    render(
      <BrowserRouter>
        <ProfileMenu isSidebarExpanded={true} />
      </BrowserRouter>,
    );

    const moreBtn = screen.getByRole('button', { name: /more/i });
    expect(moreBtn).toBeInTheDocument();

    fireEvent.click(moreBtn);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Problem report')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();

    const settingsBtn = screen.getByText('Settings');
    fireEvent.click(settingsBtn);
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
  });

  it('handles logout and clears auth store', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined as never);

    render(
      <BrowserRouter>
        <ProfileMenu isSidebarExpanded={true} />
      </BrowserRouter>,
    );

    const moreBtn = screen.getByRole('button', { name: /more/i });
    fireEvent.click(moreBtn);

    const logoutBtn = screen.getByText('Log out');
    fireEvent.click(logoutBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Log out' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
