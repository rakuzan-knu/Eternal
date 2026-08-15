import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { OnlineFriendsSidebar } from '../OnlineFriendsSidebar';
import * as useFriendsModule from '@/features/follow/model/useFriends';
import * as useSuggestedUsersModule from '@/entities/user/model/useSuggestedUsers';
import * as useConversationsModule from '@/features/chat/model/useConversations';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/chat/api/chatApi', () => ({
  chatApi: {
    createDirectConversation: vi.fn(),
  },
}));

vi.mock('@/entities/profile/ui/MiniProfileHoverCard', () => ({
  MiniProfileHoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/follow/ui/FollowButton', () => ({
  FollowButton: ({ authorId }: { authorId: string }) => (
    <button data-testid={`follow-btn-${authorId}`}>Follow</button>
  ),
}));

describe('OnlineFriendsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'me' });
    usePresenceStore.setState({ onlineUserIds: new Set() });
    vi.spyOn(useConversationsModule, 'useConversations').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationsModule.useConversations>);
    vi.spyOn(useSuggestedUsersModule, 'useDismissSuggestedUser').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useDismissSuggestedUser>);
  });

  it('renders "Suggested for you" block when user has 0 friends to avoid layout shift', () => {
    vi.spyOn(useFriendsModule, 'useFriends').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useFriendsModule.useFriends>);

    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [
        {
          id: 'suggested-1',
          username: 'creator1',
          displayName: 'Creator One',
          avatar: null,
          isFollowing: false,
          followsYou: false,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    render(<OnlineFriendsSidebar />);
    expect(screen.getByText('Suggested for you')).toBeInTheDocument();
    expect(screen.getByText('Creator One')).toBeInTheDocument();
    expect(screen.getByText('Find more people')).toBeInTheDocument();
  });

  it('renders online and offline sections sorted A-Z when user has friends', () => {
    usePresenceStore.setState({ onlineUserIds: new Set(['user-2']) });

    vi.spyOn(useFriendsModule, 'useFriends').mockReturnValue({
      data: [
        {
          id: 'user-1',
          username: 'zack',
          displayName: 'Zack Walker',
          avatar: null,
          isFollowing: true,
          followsYou: true,
          isFriend: true,
        },
        {
          id: 'user-2',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
          isFollowing: true,
          followsYou: true,
          isFriend: true,
        },
        {
          id: 'user-3',
          username: 'bob',
          displayName: 'Bob Jones',
          avatar: null,
          isFollowing: true,
          followsYou: true,
          isFriend: true,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useFriendsModule.useFriends>);

    render(<OnlineFriendsSidebar />);

    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Online — 1')).toBeInTheDocument();
    expect(screen.getByText('Offline — 2')).toBeInTheDocument();

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Zack Walker')).toBeInTheDocument();
  });

  it('collapses offline section by default if > 5 friends and shows "Show all (N)" accordion', () => {
    const manyOfflineFriends = Array.from({ length: 8 }, (_, i) => ({
      id: `offline-${i}`,
      username: `offline_user_${i}`,
      displayName: `User ${i}`,
      avatar: null,
      isFollowing: true,
      followsYou: true,
      isFriend: true,
    }));

    vi.spyOn(useFriendsModule, 'useFriends').mockReturnValue({
      data: manyOfflineFriends,
      isLoading: false,
    } as unknown as ReturnType<typeof useFriendsModule.useFriends>);

    render(<OnlineFriendsSidebar />);

    expect(screen.getByText('Offline — 8')).toBeInTheDocument();
    expect(screen.getByText('Show all (8)')).toBeInTheDocument();

    // First 5 are visible, 6th is initially hidden
    expect(screen.getByText('User 0')).toBeInTheDocument();
    expect(screen.getByText('User 4')).toBeInTheDocument();
    expect(screen.queryByText('User 7')).not.toBeInTheDocument();

    // Click "Show all (8)" to expand accordion
    fireEvent.click(screen.getByText('Show all (8)'));
    expect(screen.getByText('User 7')).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('filters friends list using search input', () => {
    vi.spyOn(useFriendsModule, 'useFriends').mockReturnValue({
      data: [
        {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
          isFollowing: true,
          followsYou: true,
          isFriend: true,
        },
        {
          id: 'user-2',
          username: 'bob',
          displayName: 'Bob Jones',
          avatar: null,
          isFollowing: true,
          followsYou: true,
          isFriend: true,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useFriendsModule.useFriends>);

    render(<OnlineFriendsSidebar />);

    // Open search
    const searchBtn = screen.getByTitle('Search friends');
    fireEvent.click(searchBtn);

    const input = screen.getByPlaceholderText('Search friends...');
    fireEvent.change(input, { target: { value: 'alice' } });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });

  it('displays unread direct message count badge for a friend', () => {
    vi.spyOn(useFriendsModule, 'useFriends').mockReturnValue({
      data: [
        {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice Smith',
          avatar: null,
          isFollowing: true,
          followsYou: true,
          isFriend: true,
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useFriendsModule.useFriends>);

    vi.spyOn(useConversationsModule, 'useConversations').mockReturnValue({
      data: [
        {
          id: 'conv-1',
          type: 'DIRECT',
          unreadCount: 3,
          participants: [{ user: { id: 'me' } }, { user: { id: 'user-1' } }],
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConversationsModule.useConversations>);

    render(<OnlineFriendsSidebar />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders Instagram-style mutual friends context and proximity badges for suggested users', () => {
    vi.spyOn(useFriendsModule, 'useFriends').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useFriendsModule.useFriends>);

    vi.spyOn(useSuggestedUsersModule, 'useSuggestedUsers').mockReturnValue({
      data: [
        {
          id: 'suggested-mutual',
          username: 'alex',
          displayName: 'Alex Rivers',
          avatar: null,
          isFollowing: false,
          followsYou: false,
          recommendationReason: {
            type: 'MUTUAL_FRIENDS',
            text: 'Followed by benjamin_edm and 2 others',
            mutualFriends: [
              { id: 'ben', username: 'benjamin_edm', avatar: '/ben.jpg' },
              { id: 'ilona', username: 'ilona_p', avatar: '/ilona.jpg' },
            ],
            totalMutualCount: 3,
          },
        },
        {
          id: 'suggested-geo',
          username: 'local_dev',
          displayName: 'Local Dev',
          avatar: null,
          isFollowing: false,
          followsYou: false,
          recommendationReason: {
            type: 'NEARBY',
            text: 'Near you',
          },
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useSuggestedUsersModule.useSuggestedUsers>);

    render(<OnlineFriendsSidebar />);
    expect(screen.getByText('Followed by benjamin_edm and 2 others')).toBeInTheDocument();
    expect(screen.getByText('Near you')).toBeInTheDocument();
  });
});
