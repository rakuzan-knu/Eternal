import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareModal } from '../ShareModal';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { followApi } from '@/features/follow/api/followApi';
import { chatApi } from '@/features/chat/api/chatApi';
import { postsApi } from '@/features/posts/api/postsApi';
import * as socketModule from '@/shared/api/socket';

vi.mock('@/entities/profile/model/useCurrentUser');

describe('ShareModal (Comprehensive Suite)', () => {
  const mockPost = {
    id: 'post-123',
    author: 'Alice Wonderland',
    handle: 'alice',
    avatar: 'https://example.com/alice.jpg',
    text: 'Exciting announcement about our new release!',
    likes: 50,
    comments: 10,
    reposts: 5,
    isLiked: false,
    isSaved: false,
    isReposted: false,
  };

  const mockUsers = [
    {
      id: 'u-1',
      username: 'charlie',
      displayName: 'Charlie Brown',
      avatar: null,
      followsYou: true,
    },
    { id: 'u-2', username: 'david', displayName: 'David Bowie', avatar: null, followsYou: false },
  ];

  const mockSocket = {
    connected: true,
    emit: vi.fn(),
  };

  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useUIStore.setState({
      isShareModalOpen: true,
      activePostForShare: mockPost as any,
    });

    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-me-1', username: 'me' } as any,
      isLoading: false,
    } as any);

    vi.spyOn(followApi, 'getFollowing').mockResolvedValue({
      items: mockUsers as any,
      nextCursor: null,
    });
    vi.spyOn(followApi, 'getFollowers').mockResolvedValue({
      items: mockUsers as any,
      nextCursor: null,
    });
    vi.spyOn(postsApi, 'share').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'createDirectConversation').mockResolvedValue({ id: 'conv-target-1' } as any);
    vi.spyOn(socketModule, 'getSocket').mockReturnValue(mockSocket as any);

    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy,
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    });

    window.open = vi.fn();
  });

  it('renders modal header, search input, and user list', async () => {
    renderWithProviders(<ShareModal />);

    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.getByText('David Bowie')).toBeInTheDocument();
    });
  });

  it('filters users based on search input', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ShareModal />);

    await waitFor(() => expect(screen.getByText('Charlie Brown')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Charlie');

    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.queryByText('David Bowie')).not.toBeInTheDocument();
  });

  it('copies post link to clipboard and tracks share when Copy link button is clicked', async () => {
    renderWithProviders(<ShareModal />);

    const copyBtn = screen.getByText('Copy link');
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('/profile/alice#post-post-123'),
    );
    expect(postsApi.share).toHaveBeenCalledWith('post-123');
  });

  it('allows selecting user, typing message, and sending via chat socket', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ShareModal />);

    await waitFor(() => expect(screen.getByText('Charlie Brown')).toBeInTheDocument());

    const userBtn = screen.getByRole('button', { name: /charlie brown/i });
    await user.click(userBtn);

    // After selecting a user, textarea and Send to Direct appear
    const messageInput = screen.getByPlaceholderText('Write a message...');
    await user.type(messageInput, 'Check out this awesome post!');

    const sendBtn = screen.getByRole('button', { name: /send to direct/i });
    await user.click(sendBtn);

    expect(chatApi.createDirectConversation).toHaveBeenCalledWith('u-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
      conversationId: 'conv-target-1',
      body: expect.stringContaining('Check out this awesome post!'),
    });
    expect(useUIStore.getState().isShareModalOpen).toBe(false);
  });

  it('opens social sharing windows on click (X, Telegram, WhatsApp, Facebook)', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ShareModal />);

    const xBtn = screen.getByRole('button', { name: /^x$/i });
    await user.click(xBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      'noopener,noreferrer',
    );

    const telegramBtn = screen.getByRole('button', { name: /telegram/i });
    await user.click(telegramBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('t.me/share/url'),
      '_blank',
      'noopener,noreferrer',
    );
  });
});
