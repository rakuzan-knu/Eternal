import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupMemberDetailView from '../GroupMemberDetailView';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConversationView, ParticipantView } from '@/entities/chat/model/types';
import React from 'react';

const mockPromoteMutate = vi.fn();
const mockDemoteMutate = vi.fn();
const mockRemoveMutate = vi.fn();

vi.mock('../../model/useConversationMutations', () => ({
  usePromoteMember: () => ({ mutate: mockPromoteMutate }),
  useDemoteMember: () => ({ mutate: mockDemoteMutate }),
  useRemoveMember: () => ({ mutate: mockRemoveMutate }),
}));

describe('GroupMemberDetailView', () => {
  const mockConversation = {
    id: 'c1',
    type: 'GROUP' as const,
    title: 'Team Chat',
    isArchived: false,
    updatedAt: '2026-01-01',
    unreadCount: 0,
    participants: [],
  } as unknown as ConversationView;

  const participant = {
    userId: 'u2',
    role: 'MEMBER' as const,
    joinedAt: '2026-01-01',
    user: {
      id: 'u2',
      username: 'alice',
      displayName: 'Alice Member',
      avatar: null,
      isVerified: false,
    },
  } as unknown as ParticipantView;

  it('renders member profile information and management actions', () => {
    const onBack = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GroupMemberDetailView
            conversation={mockConversation}
            participant={participant}
            canManage={true}
            onBack={onBack}
          />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Alice Member' })).toBeInTheDocument();
    expect(screen.getByText('Make admin')).toBeInTheDocument();
    expect(screen.getByText('Remove from group')).toBeInTheDocument();

    const makeAdminBtn = screen.getByText('Make admin');
    fireEvent.click(makeAdminBtn);
    expect(mockPromoteMutate).toHaveBeenCalledWith(
      { conversationId: 'c1', userId: 'u2' },
      expect.any(Object),
    );
  });
});
