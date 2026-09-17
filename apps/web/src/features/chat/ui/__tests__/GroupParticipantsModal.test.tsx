import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GroupParticipantsModal from '../GroupParticipantsModal';
import { ConversationView } from '@/entities/chat/model/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('GroupParticipantsModal', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const mockConversation = {
    id: 'c1',
    type: 'GROUP' as const,
    title: 'Team Chat',
    isArchived: false,
    updatedAt: '2026-01-01',
    unreadCount: 0,
    participants: [
      {
        userId: 'u1',
        role: 'OWNER' as const,
        joinedAt: '2026-01-01',
        user: {
          id: 'u1',
          username: 'owner_user',
          displayName: 'Owner User',
          avatar: null,
          isVerified: false,
        },
      },
      {
        userId: 'u2',
        role: 'ADMIN' as const,
        joinedAt: '2026-01-01',
        user: {
          id: 'u2',
          username: 'admin_user',
          displayName: 'Admin User',
          avatar: null,
          isVerified: false,
        },
      },
      {
        userId: 'u3',
        role: 'MEMBER' as const,
        joinedAt: '2026-01-01',
        user: {
          id: 'u3',
          username: 'member_user',
          displayName: 'Member User',
          avatar: null,
          isVerified: true,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders participant list, handles member selection and close button', async () => {
    const onClose = vi.fn();
    const onSelectMember = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <GroupParticipantsModal
          conversation={mockConversation}
          currentUserId="u1"
          onClose={onClose}
          onSelectMember={onSelectMember}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('3 participants')).toBeInTheDocument();
    expect(screen.getByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('Member User')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Member User'));
    expect(onSelectMember).toHaveBeenCalledWith('u3');

    const closeBtn = document.querySelector('button')!;
    fireEvent.click(closeBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('renders admins filter and opens AdminPermissionsModal for owner', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <GroupParticipantsModal
          conversation={mockConversation}
          currentUserId="u1"
          roleFilter="ADMINS"
          onClose={vi.fn()}
          onSelectMember={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('2 admins')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();

    // Click permission sliders for u2
    const sliderBtn = screen.getByTitle('Configure Admin Permissions');
    fireEvent.click(sliderBtn);
    expect(screen.getByText('Admin Permissions')).toBeInTheDocument();
  });

  it('renders participant with nickname and fallback to username', () => {
    const convWithNickname: any = {
      ...mockConversation,
      participants: [
        {
          userId: 'u4',
          role: 'MEMBER',
          nickname: 'Speedy',
          user: { id: 'u4', username: 'speedy_u', displayName: 'Fast Guy', avatar: null },
        },
        {
          userId: 'u5',
          role: 'MEMBER',
          nickname: null,
          user: { id: 'u5', username: 'no_display', displayName: null, avatar: null },
        },
      ],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <GroupParticipantsModal
          conversation={convWithNickname}
          currentUserId="u1"
          onClose={vi.fn()}
          onSelectMember={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Speedy')).toBeInTheDocument();
    expect(screen.getByText('no_display')).toBeInTheDocument();
  });
});
