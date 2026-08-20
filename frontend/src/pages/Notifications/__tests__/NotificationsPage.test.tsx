import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsPage from '../NotificationsPage';
import { useNotificationStore } from '@/entities/notification/model/useNotificationStore';
import { useUIStore } from '@/shared/model/useUIStore';

// Mock Socket.io
vi.mock('@/shared/api/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}));

// Mock Audio Playback
vi.mock('@/shared/lib/messageNotificationSound', () => ({
  playMessageNotificationSound: vi.fn(),
}));

const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-me',
    actorId: 'user-2',
    actor: {
      id: 'user-2',
      username: 'alex',
      displayName: 'Alex Kovalenko',
      avatar: null,
      isVerified: true,
      primaryBadge: null,
    },
    type: 'LIKE_POST',
    postId: 'post-1',
    commentId: null,
    text: null,
    extraCount: 2,
    isRead: false,
    createdAt: new Date().toISOString(),
    post: {
      id: 'post-1',
      content: 'Hello eternal social network!',
      mediaUrl: 'https://example.com/photo.jpg',
      mediaType: 'IMAGE',
    },
    actionText: 'Alex Kovalenko and 2 others liked your post',
    deepLink: '/post/post-1',
  },
  {
    id: 'notif-2',
    userId: 'user-me',
    actorId: 'user-3',
    actor: {
      id: 'user-3',
      username: 'daria',
      displayName: 'Daria Petrenko',
      avatar: null,
      isVerified: false,
      primaryBadge: null,
    },
    type: 'FOLLOW',
    postId: null,
    commentId: null,
    text: null,
    extraCount: 0,
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    post: null,
    actionText: 'Daria Petrenko started following you',
    deepLink: '/daria',
  },
];

// Mock API Client
vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn((url) => {
      if (url.startsWith('/notifications/unread-count')) {
        return Promise.resolve({
          data: {
            total: 1,
            likes: 1,
            comments: 0,
            follows: 0,
            mentions: 0,
            reposts: 0,
            system: 0,
          },
        });
      }
      if (url.startsWith('/notifications')) {
        return Promise.resolve({
          data: {
            items: mockNotifications,
            nextCursor: null,
            hasMore: false,
            unreadCounts: {
              total: 1,
              likes: 1,
              comments: 0,
              follows: 0,
              mentions: 0,
              reposts: 0,
              system: 0,
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    patch: vi.fn((url) => {
      if (url.startsWith('/notifications/read-all')) {
        return Promise.resolve({
          data: {
            success: true,
            count: 1,
            unreadCounts: {
              total: 0,
              likes: 0,
              comments: 0,
              follows: 0,
              mentions: 0,
              reposts: 0,
              system: 0,
            },
          },
        });
      }
      return Promise.resolve({ data: { id: 'notif-1', isRead: true } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { status: 'ACCEPTED' } })),
    delete: vi.fn(() => Promise.resolve({ data: { status: 'UNFOLLOWED' } })),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      unreadCounts: {
        total: 1,
        likes: 1,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
      activeFilter: 'all',
      optimisticFollows: {},
    });
  });

  it('renders notifications page with title and unread badge', async () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/1 new/i)).toBeInTheDocument();
  });

  it('displays notification items and smart aggregation', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Alex Kovalenko/i)).toBeInTheDocument();
      expect(screen.getByText(/and 2 others/i)).toBeInTheDocument();
      expect(screen.getByText(/liked your post/i)).toBeInTheDocument();
      expect(screen.getByText(/Daria Petrenko/i)).toBeInTheDocument();
    });
  });

  it('filters by category tabs', async () => {
    renderWithProviders(<NotificationsPage />);

    const likesTab = screen.getByRole('button', { name: /likes/i });
    expect(likesTab).toBeInTheDocument();

    fireEvent.click(likesTab);
    expect(likesTab).toHaveClass('font-semibold');
  });

  it('opens notification settings tab in edit profile modal when settings icon is clicked', async () => {
    const openEditProfileSpy = vi.spyOn(useUIStore.getState(), 'openEditProfile');

    renderWithProviders(<NotificationsPage />);

    const settingsBtn = screen.getByTitle(/notification settings/i);
    fireEvent.click(settingsBtn);

    expect(openEditProfileSpy).toHaveBeenCalledWith('notifications');
  });

  it('handles follow back button click optimistically', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Follow back')).toBeInTheDocument();
    });

    const followBtn = screen.getByText('Follow back');
    fireEvent.click(followBtn);

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeInTheDocument();
    });
  });

  it('opens 3-dot context menu and deletes notification', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Alex Kovalenko/i)).toBeInTheDocument();
    });

    const moreButtons = screen.getAllByTitle('Options');
    expect(moreButtons.length).toBeGreaterThan(0);

    fireEvent.click(moreButtons[0]);

    const deleteBtn = screen.getByText('Delete this notification');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Delete this notification')).not.toBeInTheDocument();
    });
  });
});
