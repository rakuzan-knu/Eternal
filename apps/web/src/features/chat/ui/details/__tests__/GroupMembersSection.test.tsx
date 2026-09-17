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

  it('renders admin role, nickname, username fallback, and view all for >5 participants', () => {
    const onViewAll = vi.fn();
    const multiMembersConv: any = {
      id: 'c2',
      participants: [
        {
          userId: 'u2',
          role: 'ADMIN',
          nickname: 'AdminNick',
          user: { id: 'u2', username: 'admin2', displayName: 'Admin User', avatar: null },
        },
        {
          userId: 'u3',
          role: 'MEMBER',
          nickname: null,
          user: { id: 'u3', username: 'just_username', displayName: null, avatar: null },
        },
        { userId: 'u4', role: 'MEMBER', user: { id: 'u4', username: 'u4' } },
        { userId: 'u5', role: 'MEMBER', user: { id: 'u5', username: 'u5' } },
        { userId: 'u6', role: 'MEMBER', user: { id: 'u6', username: 'u6' } },
        { userId: 'u7', role: 'MEMBER', user: { id: 'u7', username: 'u7' } },
      ],
    };

    render(
      <GroupMembersSection
        conversation={multiMembersConv}
        onAddMembers={vi.fn()}
        onSelectMember={vi.fn()}
        onViewAll={onViewAll}
      />,
    );

    expect(screen.getByText('AdminNick')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('just_username')).toBeInTheDocument();

    const viewAllBtn = screen.getByText('View all 6 participants');
    fireEvent.click(viewAllBtn);
    expect(onViewAll).toHaveBeenCalled();
  });
});
