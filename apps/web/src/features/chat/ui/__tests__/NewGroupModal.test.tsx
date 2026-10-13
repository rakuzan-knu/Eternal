import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewGroupModal from '../NewGroupModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/entities/user/api/userSearchApi', () => ({
  userSearchApi: {
    search: vi.fn(),
  },
}));

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    createGroupConversation: vi.fn(),
  },
}));

describe('NewGroupModal', () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders new group modal header, search input, and create button disabled initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewGroupModal onClose={vi.fn()} onCreated={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('New group chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('searches users, selects user chips, and triggers group creation', async () => {
    const { userSearchApi } = await import('@/entities/user/api/userSearchApi');
    const { chatApi } = await import('../../api/chatApi');

    vi.mocked(userSearchApi.search).mockResolvedValueOnce([
      { id: 'usr-1', username: 'bob', displayName: 'Bob', avatar: null } as any,
    ]);
    vi.mocked(chatApi.createGroupConversation).mockResolvedValueOnce({
      id: 'conv-new-group',
    } as any);

    const onCreated = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <NewGroupModal onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>,
    );

    const input = screen.getByPlaceholderText('Search by username');
    fireEvent.change(input, { target: { value: 'bob' } });

    const userRow = await screen.findByText('Bob');
    expect(userSearchApi.search).toHaveBeenCalledWith('bob', expect.any(AbortSignal));
    fireEvent.click(userRow);

    // Deselect by clicking chip X
    const bobElements = screen.getAllByText('Bob');
    const chip = bobElements[0].closest('button')!;
    fireEvent.click(chip);

    // Re-select
    const searchResult = screen.getByText('Bob');
    fireEvent.click(searchResult);

    const createBtn = screen.getByRole('button', { name: /create/i });
    expect(createBtn).toBeEnabled();
    fireEvent.click(createBtn);
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('conv-new-group'));
    expect(chatApi.createGroupConversation).toHaveBeenCalledWith('bob', ['usr-1']);
  });
});
