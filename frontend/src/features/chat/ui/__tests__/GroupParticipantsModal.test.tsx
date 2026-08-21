import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupParticipantsModal from '../GroupParticipantsModal';
import { ConversationView } from '@/entities/chat/model/types';
import React from 'react';

describe('GroupParticipantsModal', () => {
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
        role: 'MEMBER' as const,
        joinedAt: '2026-01-01',
        user: {
          id: 'u2',
          username: 'member_user',
          displayName: 'Member User',
          avatar: null,
          isVerified: false,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders participant list and selects a member', () => {
    const onClose = vi.fn();
    const onSelectMember = vi.fn();

    render(
      <GroupParticipantsModal
        conversation={mockConversation}
        currentUserId="u1"
        onClose={onClose}
        onSelectMember={onSelectMember}
      />,
    );

    expect(screen.getByText('2 participants')).toBeInTheDocument();
    expect(screen.getByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('Member User')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Member User'));
    expect(onSelectMember).toHaveBeenCalledWith('u2');
  });
});
