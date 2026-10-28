import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddMembersModal from '../AddMembersModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as userSearchModule from '../../model/useUserSearch';
import { chatApi } from '../../api/chatApi';
import * as mutationsModule from '../../model/useConversationMutations';

describe('AddMembersModal', () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
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
      isError: false,
      retry: async () => {},
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

  it('exposes named search, clear, close and input Escape controls', async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={[]} onClose={onClose} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('dialog', { name: 'Add members' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close add members' })).toBeInTheDocument();
    const search = screen.getByRole('textbox', { name: 'Search by username' });
    fireEvent.change(search, { target: { value: 'alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear people search' }));
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('keeps selected people after failed add and permits retry', async () => {
    const onClose = vi.fn();
    const add = vi
      .spyOn(chatApi, 'addMembers')
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(undefined);
    vi.spyOn(userSearchModule, 'useUserSearch').mockReturnValue({
      results: [{ id: 'usr-2', username: 'alice', displayName: 'Alice', avatar: null }],
      isSearching: false,
      isError: false,
      retry: async () => {},
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={[]} onClose={onClose} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText('@alice'));
    fireEvent.click(screen.getByRole('button', { name: 'Add (1)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your selection is kept');
    expect(screen.getByText('1/100 selected · Add up to 100 people at a time')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add (1)' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(add).toHaveBeenNthCalledWith(2, 'conv-1', ['usr-2']);
  });

  it('caps each request at 100 selected users while preserving deselection', () => {
    const people = Array.from({ length: 101 }, (_, index) => ({
      id: `usr-${index}`,
      username: `person${index}`,
      displayName: `Person ${index}`,
      avatar: null,
    }));
    vi.spyOn(userSearchModule, 'useUserSearch').mockReturnValue({
      results: people,
      isSearching: false,
      isError: false,
      retry: async () => {},
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AddMembersModal conversationId="conv-1" existingMemberIds={[]} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    act(() => people.forEach((person) => fireEvent.click(screen.getByText(`@${person.username}`))));
    expect(
      screen.getByText('100/100 selected · Add up to 100 people at a time'),
    ).toBeInTheDocument();
    expect(screen.getByText('@person100').closest('button')).toBeDisabled();
    fireEvent.click(screen.getByText('@person0'));
    expect(screen.getByText('@person100').closest('button')).toBeEnabled();
  });
});
