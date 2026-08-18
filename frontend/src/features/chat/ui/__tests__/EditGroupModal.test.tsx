import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditGroupModal from '../EditGroupModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConversationView } from '@/entities/chat/model/types';

describe('EditGroupModal', () => {
  const queryClient = new QueryClient();

  const mockGroupConv = {
    id: 'conv-group-1',
    type: 'GROUP',
    name: 'Engineers',
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-1',
        role: 'OWNER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-1',
          username: 'alice',
          displayName: 'Alice',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('renders edit group title and input with initial group name', () => {
    const onClose = vi.fn();
    const onOpenParticipants = vi.fn();
    const onOpenAdmins = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <EditGroupModal
          conversation={mockGroupConv}
          onClose={onClose}
          onOpenParticipants={onOpenParticipants}
          onOpenAdmins={onOpenAdmins}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Edit group')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Engineers')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
  });
});
