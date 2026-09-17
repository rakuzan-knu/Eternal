import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddMembersModal from '../AddMembersModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as userSearchModule from '../../model/useUserSearch';
import { chatApi } from '../../api/chatApi';
import * as mutationsModule from '../../model/useConversationMutations';

describe('AddMembersModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders add members title, search input, and add button disabled initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={['usr-1']} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Add members')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });

  it('searches for users, selects, unselects from chip, and submits', async () => {
    const onClose = vi.fn();
    vi.spyOn(chatApi, 'addMembers').mockResolvedValue({ success: true } as any);

    vi.spyOn(userSearchModule, 'useUserSearch').mockReturnValue({
      results: [
        { id: 'usr-2', username: 'alice', displayName: 'Alice', avatar: null },
        { id: 'usr-3', username: 'bob', displayName: null, avatar: null },
      ],
      isSearching: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={['usr-1']} onClose={onClose} />
      </QueryClientProvider>,
    );

    const input = screen.getByPlaceholderText('Search by username');
    fireEvent.change(input, { target: { value: 'ali' } });

    // Select Alice
    const aliceBtn = screen.getByText('Alice');
    fireEvent.click(aliceBtn);

    // Select Bob
    const bobBtn = screen.getByText('@bob');
    fireEvent.click(bobBtn);

    expect(screen.getByRole('button', { name: 'Add (2)' })).toBeEnabled();

    // Deselect Bob
    fireEvent.click(bobBtn);

    // Submit
    const addBtn = screen.getByRole('button', { name: 'Add (1)' });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(chatApi.addMembers).toHaveBeenCalledWith('conv-1', ['usr-2']);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders pending state while adding', () => {
    vi.spyOn(mutationsModule, 'useAddMembers').mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={['usr-1']} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Adding…')).toBeInTheDocument();
  });
});
