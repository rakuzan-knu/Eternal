import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupMembersSection from '../GroupMembersSection';
import { ConversationView } from '@/entities/chat/model/types';
import React from 'react';

describe('GroupMembersSection', () => {
  const mockConversation = {
    id: 'c1',
    type: 'GROUP' as const,
    title: 'Team',
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
          username: 'owner',
          displayName: 'Owner User',
          avatar: null,
          isVerified: false,
        },
      },
    ],
  };

  it('renders members section and handles add members and member selection', () => {
    const onAddMembers = vi.fn();
    const onSelectMember = vi.fn();
    const onViewAll = vi.fn();

    render(
      <GroupMembersSection
        conversation={mockConversation as unknown as ConversationView}
        onAddMembers={onAddMembers}
        onSelectMember={onSelectMember}
        onViewAll={onViewAll}
      />,
    );

    expect(screen.getByText('1 participants')).toBeInTheDocument();
    expect(screen.getByText('Owner User')).toBeInTheDocument();

    const addBtn = screen.getByTitle('Add more users');
    fireEvent.click(addBtn);
    expect(onAddMembers).toHaveBeenCalled();

    const memberBtn = screen.getByText('Owner User');
    fireEvent.click(memberBtn);
    expect(onSelectMember).toHaveBeenCalledWith('u1');
  });
});
