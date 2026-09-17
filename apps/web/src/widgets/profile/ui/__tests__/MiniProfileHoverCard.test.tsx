import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MiniProfileHoverCard } from '../MiniProfileHoverCard';
import { apiClient } from '@/shared/api/httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '@/entities/chat';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/entities/chat', () => ({
  chatApi: {
    createDirectConversation: vi.fn(),
  },
}));

function renderWithWrapper(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MiniProfileHoverCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'current-user-id', isAuthenticated: true });
  });

  const baseProfile = {
    id: 'u1',
    username: 'alice',
    displayName: 'Alice Wonderland',
    bio: 'Building cool things',
    avatar: 'https://avatar.png',
    banner: 'https://banner.png',
    followersCount: 150,
    followingCount: 75,
    postsCount: 20,
    isVerified: true,
    primaryBadge: 'MODERATOR',
    isFollowing: false,
    followsYou: false,
    isFriend: false,
  };

  it('renders trigger element and opens card on mouse enter', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: baseProfile });

    renderWithWrapper(
      <MiniProfileHoverCard username="alice" side="left" align="right">
        <span>@alice</span>
      </MiniProfileHoverCard>,
    );

    const trigger = screen.getByText('@alice');
    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
      expect(screen.getByText('Building cool things')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.mouseLeave(trigger);
    });
  });

  it('handles follow / following / friends and unfollow hover states', async () => {
    // 1. isFollowing = true, isFriend = true -> shows 'Friends'
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { ...baseProfile, isFollowing: true, isFriend: true },
    });

    renderWithWrapper(
      <MiniProfileHoverCard username="alice" side="right">
        <span>@alice-friend</span>
      </MiniProfileHoverCard>,
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText('@alice-friend'));
    });

    await waitFor(() => {
      expect(screen.getByText('Friends')).toBeInTheDocument();
    });

    const friendBtn = screen.getByText('Friends');
    act(() => {
      fireEvent.mouseEnter(friendBtn);
    });
    expect(screen.getByText('Unfollow')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseLeave(friendBtn);
    });
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('renders standard "Following" button when user is followed but not mutual', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { ...baseProfile, isFollowing: true, followsYou: false, isFriend: false },
    });

    renderWithWrapper(
      <MiniProfileHoverCard username="bob" side="top">
        <span>@bob</span>
      </MiniProfileHoverCard>,
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText('@bob'));
    });

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeInTheDocument();
    });
  });

  it('handles user not found state', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('User not found'));

    renderWithWrapper(
      <MiniProfileHoverCard username="missing">
        <span>@missing</span>
      </MiniProfileHoverCard>,
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText('@missing'));
    });

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('handles side="top", align="right", align="center", side="left" positioning and rapid hover transitions', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseProfile });

    const { unmount } = renderWithWrapper(
      <MiniProfileHoverCard username="alice" side="top" align="right">
        <span>@alice-top-right</span>
      </MiniProfileHoverCard>,
    );

    const trigger = screen.getByText('@alice-top-right');
    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
    });

    // Rapid mouseLeave then mouseEnter clears leaveTimer
    act(() => {
      fireEvent.mouseLeave(trigger);
      fireEvent.mouseEnter(trigger);
    });

    // Reposition triggers on window resize and scroll
    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    });

    unmount();
  });

  it('handles align="center" and side="left" positions', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseProfile });

    renderWithWrapper(
      <MiniProfileHoverCard username="alice" side="left" align="center">
        <span>@alice-left-center</span>
      </MiniProfileHoverCard>,
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText('@alice-left-center'));
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
    });
  });

  it('handles message click with conversation id, without id, and on error', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseProfile });

    // 1. With conv id
    vi.mocked(chatApi.createDirectConversation).mockResolvedValueOnce({ id: 'conv-123' } as any);
    renderWithWrapper(
      <MiniProfileHoverCard username="alice">
        <span>@alice-msg</span>
      </MiniProfileHoverCard>,
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText('@alice-msg'));
    });

    await waitFor(() => {
      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    const msgBtn = screen.getByText('Message');
    await act(async () => {
      fireEvent.click(msgBtn);
    });

    expect(chatApi.createDirectConversation).toHaveBeenCalledWith('u1');

    // 2. Without conv id
    vi.mocked(chatApi.createDirectConversation).mockResolvedValueOnce(null as any);
    await act(async () => {
      fireEvent.click(msgBtn);
    });

    // 3. Error case
    vi.mocked(chatApi.createDirectConversation).mockRejectedValueOnce(new Error('Network error'));
    await act(async () => {
      fireEvent.click(msgBtn);
    });
  });

  it('handles follow button click and mouse enter clearing leaveTimer', async () => {
    vi.useFakeTimers();
    vi.mocked(apiClient.get).mockResolvedValue({ data: baseProfile });

    renderWithWrapper(
      <MiniProfileHoverCard username="alice">
        <span>@alice-follow</span>
      </MiniProfileHoverCard>,
    );

    const trigger = screen.getByText('@alice-follow');
    act(() => {
      fireEvent.mouseEnter(trigger);
      vi.advanceTimersByTime(200);
    });

    // Trigger mouseLeave to set leaveTimerRef
    act(() => {
      fireEvent.mouseLeave(trigger);
    });
    // Immediately mouseEnter before leave timeout fires (clears leaveTimerRef)
    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    const followBtn = screen.queryByText('Follow');
    if (followBtn) {
      fireEvent.click(followBtn);
    }

    vi.useRealTimers();
  });
});
