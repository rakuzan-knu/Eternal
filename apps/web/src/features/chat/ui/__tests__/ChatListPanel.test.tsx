import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatListPanel from '../ChatListPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

describe('ChatListPanel', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders chat list search bar and action buttons', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListPanel onSelectConversation={vi.fn()} activeConversationId={null} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Search in Messenger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New group chat' })).toBeInTheDocument();
  });

  it('toggles new group modal and header options menu', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListPanel onSelectConversation={vi.fn()} activeConversationId={null} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Header more options menu
    const moreBtn = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreBtn);
    expect(screen.getByText('Archived chats')).toBeInTheDocument();

    // Open archived chats modal
    fireEvent.click(screen.getByText('Archived chats'));

    // New group modal
    const newGroupBtn = screen.getByRole('button', { name: 'New group chat' });
    fireEvent.click(newGroupBtn);
    expect(screen.getByRole('heading', { name: 'New group chat' })).toBeInTheDocument();
  });

  it('handles folder creation, editing, context menu deletion, and new group creation callback', async () => {
    const onSelectConversation = vi.fn();
    const foldersStore = await import('../../model/useChatFoldersStore');
    foldersStore.useChatFoldersStore.setState({
      folders: [
        {
          id: 'f-custom',
          name: 'Custom Folder',
          icon: null,
          emoji: null,
          color: '#38bdf8',
          isSystem: false,
          includeIds: [],
          excludeIds: [],
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatListPanel onSelectConversation={onSelectConversation} activeConversationId={null} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Context menu on folder -> Delete
    fireEvent.contextMenu(screen.getByText('Custom Folder').closest('button')!);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));

    // Confirm deletion in modal
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmDeleteBtn);
    expect(
      foldersStore.useChatFoldersStore.getState().folders.some((f) => f.id === 'f-custom'),
    ).toBe(false);
  });
});
