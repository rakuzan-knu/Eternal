import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StandaloneChatPage from '../StandaloneChatPage';
import { useAuthStore } from '@/shared/model/useAuthStore';
import * as useConversationsModule from '@/features/chat/model/useConversations';
import * as useMessagesModule from '@/features/chat/model/useMessages';
import * as useMessageActionsModule from '@/features/chat/model/useMessageActions';
import * as useConversationRealtimeModule from '@/features/chat/model/useConversationRealtime';
import * as usePresenceModule from '@/features/chat/model/usePresence';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';

vi.mock('@/shared/lib/broadcastSync', () => ({
  initCrossTabSync: vi.fn(),
}));

vi.mock('@/features/chat/ui/MessageList', () => ({
  default: ({ onReply, onEdit, onDelete, onForward, onTogglePin }: any) => (
    <div data-testid="message-list">
      <button
        onClick={() =>
          onReply({ id: 'msg-1', body: 'Hello there', sender: { displayName: 'Bob' } })
        }
      >
        Reply Mock
      </button>
      <button onClick={() => onEdit({ id: 'msg-1', body: 'Edit me' })}>Edit Mock</button>
      <button onClick={() => onDelete('msg-1', false)}>Delete Mock</button>
      <button
        onClick={() =>
          onForward({ id: 'msg-1', body: 'Forward me', sender: { displayName: 'Bob' } })
        }
      >
        Forward Mock
      </button>
      <button onClick={() => onTogglePin({ id: 'msg-1', isPinned: false })}>Pin Mock</button>
    </div>
  ),
}));

vi.mock('@/features/chat/ui/MessageSearchPanel', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="search-panel">
      <span>Search Panel</span>
      <button onClick={onClose}>Close Search</button>
    </div>
  ),
}));

vi.mock('@/features/chat/ui/ConversationDetailsPanel', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="details-panel">
      <span>Details Panel</span>
      <button onClick={onClose}>Close Details</button>
    </div>
  ),
}));

vi.mock('@/features/chat/ui/ForwardMessageModal', () => ({
  default: ({ onClose, onForward }: any) => (
    <div data-testid="forward-modal">
      <button onClick={() => onForward(['conv-2'])}>Confirm Forward</button>
      <button onClick={onClose}>Cancel Forward</button>
    </div>
  ),
}));

describe('StandaloneChatPage', () => {
  let queryClient: QueryClient;
  const mockSendMessage = vi.fn().mockResolvedValue({});
  const mockMarkRead = vi.fn();
  const mockUnpinMessage = vi.fn().mockResolvedValue({});
  const mockPinMessage = vi.fn().mockResolvedValue({});
  const mockEditMessage = vi.fn().mockResolvedValue({});
  const mockDeleteMessage = vi.fn().mockResolvedValue({});

  const sampleConversation = {
    id: 'conv-1',
    type: 'DIRECT',
    participants: [
      { userId: 'user-1', user: { id: 'user-1', username: 'me', displayName: 'Me', avatar: null } },
      {
        userId: 'user-2',
        user: { id: 'user-2', username: 'bob', displayName: 'Bob Jones', avatar: null },
      },
    ],
    pinnedMessages: [{ id: 'pin-1', body: 'Important announcement' }],
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.setState({ userId: 'user-1', isAuthenticated: true });
    useChatDraftsStore.setState({ drafts: {} });

    vi.spyOn(useConversationsModule, 'useConversations').mockReturnValue({
      data: [sampleConversation as any],
      isLoading: false,
    } as any);

    vi.spyOn(useMessagesModule, 'useMessages').mockReturnValue({
      messages: [],
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
    } as any);

    vi.spyOn(useMessageActionsModule, 'useMessageActions').mockReturnValue({
      sendMessage: mockSendMessage,
      markRead: mockMarkRead,
      unpinMessage: mockUnpinMessage,
      pinMessage: mockPinMessage,
      editMessage: mockEditMessage,
      deleteMessage: mockDeleteMessage,
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
      forwardMessage: vi.fn().mockResolvedValue({}),
    } as any);

    vi.spyOn(useConversationRealtimeModule, 'useConversationRealtime').mockReturnValue({
      typingUserIds: new Set(),
      realtimeStatus: 'connected',
    } as any);

    vi.spyOn(usePresenceModule, 'useQueryOnlineStatus').mockReturnValue({} as any);
  });

  const renderComponent = (conversationId = 'conv-1') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/chat/standalone/${conversationId}`]}>
          <Routes>
            <Route path="/chat/standalone/:conversationId" element={<StandaloneChatPage />} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('renders loading indicator when conversations are loading', () => {
    vi.spyOn(useConversationsModule, 'useConversations').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderComponent();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders "Chat Not Found" when conversation does not exist', () => {
    renderComponent('unknown-conv');
    expect(screen.getByText('Chat Not Found')).toBeInTheDocument();
    expect(screen.getByText('Close Window')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    useAuthStore.setState({ userId: null, isAuthenticated: false });
    renderComponent();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders conversation details and header properly', () => {
    renderComponent();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Important announcement')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
  });

  it('sends message when typing text and clicking send', async () => {
    const user = userEvent.setup({ delay: null });
    renderComponent();

    const input = screen.getByPlaceholderText('Write a message...');
    await user.type(input, 'Hello Bob');
    const sendButton = screen.getByTitle('Send message');
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith('Hello Bob', undefined);
  });

  it('sends message on Enter key press', async () => {
    renderComponent();

    const input = screen.getByPlaceholderText('Write a message...');
    fireEvent.change(input, { target: { value: 'Test on Enter' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(mockSendMessage).toHaveBeenCalledWith('Test on Enter', undefined);
  });

  it('toggles search and details panels', async () => {
    const user = userEvent.setup({ delay: null });
    renderComponent();

    await user.click(screen.getByTitle('Search'));
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();

    await user.click(screen.getByText('Close Search'));
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument();

    await user.click(screen.getByTitle('Conversation details'));
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
  });

  it('handles reply and forward flows', async () => {
    const user = userEvent.setup({ delay: null });
    renderComponent();

    await user.click(screen.getByText('Reply Mock'));
    expect(screen.getByText('Replying to Bob')).toBeInTheDocument();

    await user.click(screen.getByText('Forward Mock'));
    expect(screen.getByTestId('forward-modal')).toBeInTheDocument();
    await user.click(screen.getByText('Confirm Forward'));
  });

  it('handles unpinning pinned message', async () => {
    const user = userEvent.setup({ delay: null });
    renderComponent();

    const unpinButton = screen.getByTitle('Unpin message');
    await user.click(unpinButton);
    expect(mockUnpinMessage).toHaveBeenCalledWith('pin-1');
  });

  it('toggles window maximize', async () => {
    const user = userEvent.setup({ delay: null });
    renderComponent();

    const maxButton = screen.getByTitle('Maximize');
    await user.click(maxButton);
    expect(screen.getByTitle('Restore')).toBeInTheDocument();
  });
});
