import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniProfileHoverCard } from '../MiniProfileHoverCard';
import { renderWithProviders } from '@/test/renderWithProviders';
import { apiClient as api } from '@/shared/api/httpClient';
import { postsApi } from '@/entities/post/api/postsApi';
import { chatApi } from '@/features/chat/api/chatApi';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useUIStore } from '@/shared/model/useUIStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MiniProfileHoverCard (Comprehensive Suite)', () => {
  const mockProfile = {
    id: 'user-42',
    username: 'bob_ross',
    displayName: 'Bob Ross',
    avatar: 'https://example.com/avatar.jpg',
    banner: 'https://example.com/banner.jpg',
    bannerPosition: 50,
    bio: 'Happy little clouds and trees',
    isVerified: true,
    primaryBadge: 'DEVELOPER',
    followersCount: 15400,
    followingCount: 120,
    postsCount: 45,
    isFollowing: false,
    followsYou: false,
    isFriend: false,
  };

  const mockPosts = [
    {
      id: 'post-1',
      authorId: 'user-42',
      author: {
        id: 'user-42',
        username: 'bob_ross',
        displayName: 'Bob Ross',
        avatar: null,
      },
      text: 'First post with happy trees',
      likes: 124,
      comments: 5,
      reposts: 2,
      isLiked: false,
      isSaved: false,
      isReposted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      media: [{ type: 'image', url: 'https://example.com/tree.jpg' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'current-user-1' });
    vi.spyOn(api, 'get').mockResolvedValue({ data: mockProfile });
    vi.spyOn(postsApi, 'getUserPosts').mockResolvedValue({
      posts: mockPosts as any,
      nextCursor: null,
    });
    vi.spyOn(chatApi, 'createDirectConversation').mockResolvedValue({ id: 'conv-99' } as any);
  });

  it('renders children trigger and opens card on hover after delay', async () => {
    renderWithProviders(
      <MiniProfileHoverCard username="bob_ross">
        <span>Hover Me</span>
      </MiniProfileHoverCard>,
    );

    const trigger = screen.getByText('Hover Me');
    fireEvent.mouseEnter(trigger);

    await waitFor(() => {
      expect(screen.getByText('Bob Ross')).toBeInTheDocument();
      expect(screen.getByText('Happy little clouds and trees')).toBeInTheDocument();
    });

    expect(screen.getByText('15.4K')).toBeInTheDocument(); // formatted followers
  });

  it('navigates to conversation when message button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(
      <MiniProfileHoverCard username="bob_ross">
        <span>Hover Me</span>
      </MiniProfileHoverCard>,
    );

    fireEvent.mouseEnter(screen.getByText('Hover Me'));

    await waitFor(() => expect(screen.getByText('Message')).toBeInTheDocument());

    const messageBtn = screen.getByRole('button', { name: /message/i });
    await user.click(messageBtn);

    expect(chatApi.createDirectConversation).toHaveBeenCalledWith('user-42');
    expect(mockNavigate).toHaveBeenCalledWith('/messages/conv-99');
  });

  it('opens comment modal when recent post preview thumbnail is clicked', async () => {
    const openCommentModalSpy = vi.spyOn(useUIStore.getState(), 'openCommentModal');

    renderWithProviders(
      <MiniProfileHoverCard username="bob_ross">
        <span>Hover Me</span>
      </MiniProfileHoverCard>,
    );

    fireEvent.mouseEnter(screen.getByText('Hover Me'));

    await waitFor(() => {
      expect(screen.getByAltText('First post with happy trees')).toBeInTheDocument();
    });

    const postThumb = screen.getByAltText('First post with happy trees');
    fireEvent.click(postThumb);

    expect(openCommentModalSpy).toHaveBeenCalled();
  });
});
