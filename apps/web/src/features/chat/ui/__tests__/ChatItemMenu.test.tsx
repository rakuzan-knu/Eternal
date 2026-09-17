import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatItemMenu from '../ChatItemMenu';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ConversationView } from '@/entities/chat/model/types';
import { useChatFoldersStore } from '../../model/useChatFoldersStore';

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
            conversationTitle="Alice"
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
    expect(screen.getByText('Clear history')).toBeInTheDocument();
    expect(screen.getByText('Delete chat')).toBeInTheDocument();
  });

  it('opens DeleteChatHistoryModal when clicking Clear history and keeps modal open', () => {
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            conversationTitle="Alice"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={onClose}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const clearBtn = screen.getByText('Clear history');
    fireEvent.click(clearBtn);

    // Modal should now be open and NOT unmounted
    expect(
      screen.getByText(/Are you sure you want to delete all message history with/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Clicking cancel should close modal and call onClose
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens DeleteChatModal when clicking Delete chat and keeps modal open', () => {
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            conversationTitle="Alice"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={onClose}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const deleteBtn = screen.getByText('Delete chat');
    fireEvent.click(deleteBtn);

    // Modal should now be open and NOT unmounted
    expect(screen.getByRole('heading', { name: /Delete chat/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens MuteOptionsModal from notifications submenu and keeps modal open', () => {
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            conversationTitle="Alice"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={onClose}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const muteMenuBtn = screen.getByText('Mute notifications');
    fireEvent.click(muteMenuBtn);

    const muteForBtn = screen.getByText('Mute for...');
    expect(muteForBtn).toBeInTheDocument();
    fireEvent.click(muteForBtn);

    // Mute options modal should be open and not immediately closed
    expect(screen.getByText('Mute conversation')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders folders and Create folder in Add to folder submenu', () => {
    const onCreateFolder = vi.fn();
    useChatFoldersStore.setState({
      folders: [
        {
          id: 'work',
          name: 'Work',
          icon: null,
          emoji: null,
          color: '#3b82f6',
          includeIds: ['conv-1'],
          excludeIds: [],
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            conversationTitle="Alice"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
            onCreateFolder={onCreateFolder}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const folderMenuBtn = screen.getByText('Add to folder');
    fireEvent.click(folderMenuBtn);

    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Create folder')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Create folder'));
    expect(onCreateFolder).toHaveBeenCalled();
  });

  it('handles SelectToneModal, open in new window, toggle pin and archive', () => {
    const onTogglePin = vi.fn();
    const onClose = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ opener: null } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={{ ...mockConv, isPinned: true }}
            otherUserId="usr-2"
            conversationTitle="Alice"
            isPinnedLocally={true}
            isForcedUnread={true}
            onClose={onClose}
            onTogglePinLocally={onTogglePin}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // 1. Open in new window
    fireEvent.click(screen.getByText('Open in new window'));
    expect(openSpy).toHaveBeenCalledWith(
      '/messages/standalone/conv-1',
      'chat_standalone_conv-1',
      expect.any(String),
    );

    // 2. Unpin
    fireEvent.click(screen.getByText('Unpin'));
    expect(onTogglePin).toHaveBeenCalledWith('conv-1');

    // 3. Select tone modal
    const muteMenuBtn = screen.getByText('Mute notifications');
    fireEvent.click(muteMenuBtn);
    fireEvent.click(screen.getByText('Select tone'));
    expect(screen.getByText('Select chat tone')).toBeInTheDocument();
  });

  it('handles profile navigation and confirmation handlers for clear, delete, and mute', async () => {
    const mutationsModule = await import('../../model/useConversationMutations');
    const mockClearMutate = vi.fn();
    const mockDeleteMutate = vi.fn();
    const mockMuteMutate = vi.fn();

    vi.spyOn(mutationsModule, 'useClearChatHistory').mockReturnValue({
      mutate: mockClearMutate,
      isPending: false,
    } as any);
    vi.spyOn(mutationsModule, 'useDeleteConversation').mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    } as any);
    vi.spyOn(mutationsModule, 'useMuteConversation').mockReturnValue({
      mutate: mockMuteMutate,
      isPending: false,
    } as any);

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            otherUsername="alice"
            conversationTitle="Alice"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Profile navigation
    fireEvent.click(screen.getByText('View user profile'));

    // Confirm Clear History
    fireEvent.click(screen.getByText('Clear history'));
    const confirmClearBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmClearBtn);
    unmount();

    // Fresh render for Delete Chat
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatItemMenu
            conversation={mockConv}
            otherUserId="usr-2"
            otherUsername="alice"
            conversationTitle="Alice"
            isPinnedLocally={false}
            isForcedUnread={false}
            onClose={vi.fn()}
            onTogglePinLocally={vi.fn()}
            onToggleUnreadLocally={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('Delete chat'));
    const confirmDeleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(confirmDeleteBtn);
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1' }),
    );
  });
});
