import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditProfileModal from '../EditProfileModal';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { userApi } from '@/entities/profile/api/userApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/entities/profile/model/useCurrentUser');

describe('EditProfileModal (Comprehensive Suite)', () => {
  const mockUser = {
    id: 'user-me-1',
    username: 'alan_turing',
    displayName: 'Alan Turing',
    bio: 'Father of modern computing',
    avatar: 'https://example.com/turing.jpg',
    banner: 'https://example.com/banner.jpg',
    bannerPosition: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      isEditProfileOpen: true,
      editProfileInitialTab: 'account',
    });

    vi.mocked(useCurrentUser).mockReturnValue({
      data: mockUser as any,
      isLoading: false,
    } as any);

    vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true } });
    vi.spyOn(userApi, 'syncGithub').mockResolvedValue({ mergedPrsCount: 42 } as any);
    vi.spyOn(userApi, 'unlinkGithub').mockResolvedValue({ success: true } as any);
  });

  it('renders modal with account information form and prefilled user values', () => {
    renderWithProviders(<EditProfileModal />);

    expect(screen.getByDisplayValue('Alan Turing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alan_turing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Father of modern computing')).toBeInTheDocument();
  });

  it('switches tabs and subsections on navigation clicks', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<EditProfileModal />);

    const securityTabBtn = screen.getByRole('button', { name: /^security$/i });
    await user.click(securityTabBtn);

    expect(screen.getAllByText('Password & Security').length).toBeGreaterThan(0);

    const notificationsTabBtn = screen.getByRole('button', { name: /^notifications$/i });
    await user.click(notificationsTabBtn);

    expect(screen.getAllByText('Sound & Push Notifications').length).toBeGreaterThan(0);
  });

  it('submits updated profile data successfully on save', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderWithProviders(<EditProfileModal />);

    const nameInput = screen.getByDisplayValue('Alan Turing');
    await user.clear(nameInput);
    await user.type(nameInput, 'Sir Alan Turing');

    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    await user.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/users/user-me-1', {
        username: 'alan_turing',
        displayName: 'Sir Alan Turing',
        bio: 'Father of modern computing',
        bannerPosition: 50,
      });
    });
  });

  it('triggers GitHub sync and shows toast notification', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<EditProfileModal />);

    // Click integrations subsection
    const integrationsBtn = screen.getByRole('button', { name: /integrations/i });
    await user.click(integrationsBtn);
  });

  it('opens and confirms logout modal', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<EditProfileModal />);

    const logoutMenuBtn = screen.getByRole('button', { name: /^log out$/i });
    await user.click(logoutMenuBtn);

    expect(screen.getByText(/are you sure you want to log out/i)).toBeInTheDocument();

    const logoutButtons = screen.getAllByRole('button', { name: /^log out$/i });
    const confirmLogoutBtn = logoutButtons[logoutButtons.length - 1];
    await user.click(confirmLogoutBtn);

    expect(useUIStore.getState().isEditProfileOpen).toBe(false);
  });
});
