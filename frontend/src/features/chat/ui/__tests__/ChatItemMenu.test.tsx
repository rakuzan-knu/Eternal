import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatItemMenu from '../ChatItemMenu';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView } from '@/entities/chat/model/types';

describe('ChatItemMenu', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [],
  } as unknown as ConversationView;

  it('renders chat context menu options', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Mark as unread')).toBeInTheDocument();
  });
});
