import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessengerSidebar from '../RailwaySidebar';
import { useUIStore } from '@/shared/model/useUIStore';
import * as useCurrentUserModule from '@/entities/profile/model/useCurrentUser';
import * as useUnreadMessagesCountModule from '@/features/chat/model/useUnreadMessagesCount';
import * as usePresenceModule from '@/features/chat/model/usePresence';

import { renderWithProviders } from '../../../../test/renderWithProviders';

vi.mock('@/features/sidebar/ui/SidebarMenu', () => ({
  ProfileMenu: () => <div data-testid="profile-menu">ProfileMenu</div>,
}));

describe('RailwaySidebar (MessengerSidebar)', () => {
  beforeEach(() => {
    useUIStore.setState({ isSidebarExpanded: true });
    vi.spyOn(useCurrentUserModule, 'useCurrentUser').mockReturnValue({
      data: {
        id: 'user-1',
        username: 'alice',
        displayName: 'Alice Smith',
        avatar: 'https://example.com/avatar.png',
      },
      isLoading: false,
    } as any);
    vi.spyOn(useUnreadMessagesCountModule, 'useUnreadMessagesCount').mockReturnValue(3);
    vi.spyOn(usePresenceModule, 'useQueryOnlineStatus').mockReturnValue({} as any);
  });

  const renderComponent = (path = '/') => {
    return renderWithProviders(<MessengerSidebar />, { initialEntries: [path] });
  };

  it('renders brand name and all navigation links when expanded', () => {
    renderComponent();

    expect(screen.getByText('Eternal')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Reels')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('displays unread messages badge', () => {
    renderComponent();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('toggles sidebar expansion on toggle button click', async () => {
    const user = userEvent.setup();
    renderComponent();

    const toggleButton = screen.getByLabelText('Close sidebar');
    await user.click(toggleButton);

    expect(useUIStore.getState().isSidebarExpanded).toBe(false);
  });

  it('renders collapsed view properly', () => {
    useUIStore.setState({ isSidebarExpanded: false });
    renderComponent();

    expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
  });
});
