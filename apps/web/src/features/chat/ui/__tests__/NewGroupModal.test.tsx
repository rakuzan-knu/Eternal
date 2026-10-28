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

  it('closes with Escape while searching and exposes a named dialog', async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <NewGroupModal onClose={onClose} onCreated={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('dialog', { name: 'New group chat' })).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Search by username' });
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('clears the people search and returns focus to the field', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewGroupModal onClose={vi.fn()} onCreated={vi.fn()} />
      </QueryClientProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Search by username' });
    fireEvent.change(input, { target: { value: 'bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear people search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
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

  it('accepts more than ten members and keeps a long generated name within the API contract', async () => {
    const { userSearchApi } = await import('@/entities/user/api/userSearchApi');
    const { chatApi } = await import('../../api/chatApi');
    const people = Array.from({ length: 11 }, (_, index) => ({
      id: `usr-${index}`,
      username: `participant_${index}_with_long_name`,
      displayName: `Person ${index}`,
      avatar: null,
    }));
    vi.mocked(userSearchApi.search).mockReset().mockResolvedValue(people);
    vi.mocked(chatApi.createGroupConversation).mockReset().mockRejectedValue(new Error('Offline'));
    render(
      <QueryClientProvider client={queryClient}>
        <NewGroupModal onClose={vi.fn()} onCreated={vi.fn()} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search by username' }), {
      target: { value: 'participant' },
    });
    await screen.findByText('@participant_0_with_long_name');
    people.forEach((person) => fireEvent.click(screen.getByText(`@${person.username}`)));
    expect(screen.getByText('11/100 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create group (12)' }));
    await waitFor(() =>
      expect(chatApi.createGroupConversation).toHaveBeenCalledWith(
        'New group',
        people.map((person) => person.id),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Your selection is saved');
    expect(screen.getByText('11/100 selected')).toBeInTheDocument();
  });
});
