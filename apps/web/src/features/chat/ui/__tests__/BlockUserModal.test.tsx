import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlockUserModal from '../BlockUserModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('BlockUserModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders block user search input and header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BlockUserModal onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Block someone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
  });

  it('lists chattedWith users, handles search results, and blocks user', async () => {
    const userSearchModule = await import('../../model/useUserSearch');
    const conversationsModule = await import('../../model/useConversations');
    const blockedUsersModule = await import('../../model/useBlockedUsers');
    const chatApiModule = await import('../../api/chatApi');
    const blockSpy = vi
      .spyOn(chatApiModule.chatApi, 'blockUser')
      .mockResolvedValue({ success: true } as any);

    vi.spyOn(conversationsModule, 'useConversations').mockReturnValue({
      data: [
        {
          id: 'c1',
          participants: [
            { userId: 'my-id', user: { username: 'me', displayName: 'Me', avatar: null } },
            { userId: 'u2', user: { username: 'alice', displayName: 'Alice', avatar: null } },
          ],
        },
      ],
    } as any);

    vi.spyOn(blockedUsersModule, 'useBlockedUsers').mockReturnValue({
      data: [],
    } as any);

    vi.spyOn(userSearchModule, 'useUserSearch').mockReturnValue({
      results: [{ id: 'u3', username: 'bob', displayName: 'Bob', avatar: 'https://avatar.png' }],
      isSearching: false,
    });

    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlockUserModal onClose={onClose} />
      </QueryClientProvider>,
    );

    // Initial chattedWith should show Alice
    expect(screen.getByText("People you've chatted with")).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Block Alice
    const blockBtn = screen.getAllByRole('button', { name: /block/i })[0];
    fireEvent.click(blockBtn);

    await waitFor(() => {
      expect(blockSpy).toHaveBeenCalledWith('u2');
      expect(onClose).toHaveBeenCalled();
    });

    // Type in search query to show search candidate Bob
    const input = screen.getByPlaceholderText('Search by username');
    fireEvent.change(input, { target: { value: 'bob' } });
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
