import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RestrictedAccountsPanel from '../RestrictedAccountsPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { chatApi } from '../../api/chatApi';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useAuthStore } from '@/shared/model/useAuthStore';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getBlockedUsers: vi.fn().mockResolvedValue([]),
    unblockUser: vi.fn().mockResolvedValue({ success: true }),
    getConversations: vi.fn().mockResolvedValue([]),
  },
}));

describe('RestrictedAccountsPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData([CONVERSATIONS_KEY], []);
  });

  it('renders restricted accounts panel with block someone new button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RestrictedAccountsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Restricted accounts')).toBeInTheDocument();
    expect(screen.getByText('Block someone new')).toBeInTheDocument();
  });

  it('handles opening block modal, unblocking user, and clicking back button', async () => {
    vi.mocked(chatApi.getBlockedUsers).mockResolvedValueOnce([
      { id: 'u-blocked', username: 'spammer', displayName: 'Spam Bot', avatar: null } as any,
    ]);
    vi.mocked(chatApi.unblockUser).mockResolvedValueOnce({ success: true } as any);

    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <RestrictedAccountsPanel onClose={onClose} />
      </QueryClientProvider>,
    );

    // Open block modal
    const blockNewBtn = screen.getByText('Block someone new');
    fireEvent.click(blockNewBtn);
    expect(screen.getByText('Block someone')).toBeInTheDocument();

    // Close block modal (header X button)
    const searchInput = screen.getByPlaceholderText('Search by username');
    expect(searchInput).toBeInTheDocument();

    // Unblock user
    const unblockBtn = await screen.findByRole('button', { name: 'Unblock' });
    fireEvent.click(unblockBtn);

    // Back button
    vi.useFakeTimers();
    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);
    // Double click back while isClosing
    fireEvent.click(backBtn);
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders "No blocked accounts" empty state when list is empty', async () => {
    vi.mocked(chatApi.getBlockedUsers).mockResolvedValueOnce([]);

    render(
      <QueryClientProvider client={queryClient}>
        <RestrictedAccountsPanel onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('No blocked accounts')).toBeInTheDocument();
  });
});
