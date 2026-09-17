import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ShareModal } from '../ShareModal';
import { useUIStore } from '@/shared/model/useUIStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PostType } from '@/entities/post/model/types';
import { followApi } from '@/entities/user';
import { chatApi } from '@/entities/chat';
import { postsApi } from '@/features/posts/api/postsApi';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'usr-me', username: 'me' } }),
}));

describe('ShareModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useUIStore.setState({
      isShareModalOpen: true,
      activePostForShare: {
        id: 'post-99',
        handle: 'creator',
        author: 'Content Creator',
        text: 'Sharing is caring!',
        createdAt: new Date().toISOString(),
      } as unknown as PostType,
    });

    vi.spyOn(followApi, 'getFollowing').mockResolvedValue({
      items: [
        { id: 'u1', username: 'alice', displayName: 'Alice', followsYou: true },
        { id: 'u2', username: 'bob', displayName: 'Bob', followsYou: false },
      ],
    } as any);

    vi.spyOn(followApi, 'getFollowers').mockResolvedValue({
      items: [{ id: 'u1', username: 'alice', displayName: 'Alice' }],
    } as any);

    vi.spyOn(postsApi, 'share').mockResolvedValue({ success: true } as any);

    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders share modal and allows searching and selecting users to send a direct message', async () => {
    vi.spyOn(chatApi, 'createDirectConversation').mockResolvedValue({ id: 'conv-1' } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShareModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Spread')).toBeInTheDocument();

    // Mutual user loaded
    const userBtn = await screen.findByText('Alice');
    expect(userBtn).toBeInTheDocument();

    // Select Alice
    fireEvent.click(userBtn);

    // Message input appears
    const textarea = screen.getByPlaceholderText('Write a message...');
    fireEvent.change(textarea, { target: { value: 'Look at this!' } });

    // Click Send
    const sendBtn = screen.getByRole('button', { name: /send to direct/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(chatApi.createDirectConversation).toHaveBeenCalledWith('u1');
    expect(useUIStore.getState().isShareModalOpen).toBe(false);
  });

  it('handles social sharing buttons and carousel navigation', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShareModal />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Social buttons
    const copyBtn = screen.getByText('Copy link');
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    const fbBtn = screen.getByText('Facebook');
    fireEvent.click(fbBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('facebook.com'),
      '_blank',
      expect.any(String),
    );

    const waBtn = screen.getByText('WhatsApp');
    fireEvent.click(waBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp.com'),
      '_blank',
      expect.any(String),
    );

    const tgBtn = screen.getByText('Telegram');
    fireEvent.click(tgBtn);
    expect(window.open).toHaveBeenCalled();
  });
});
