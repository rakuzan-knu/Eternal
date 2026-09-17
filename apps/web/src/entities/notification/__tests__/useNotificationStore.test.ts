import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '../model/useNotificationStore';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      unreadCounts: {
        total: 0,
        likes: 0,
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

  it('updates unread counts', () => {
    useNotificationStore.getState().setUnreadCounts({ total: 5, likes: 3, comments: 2 });
    expect(useNotificationStore.getState().unreadCounts).toEqual({
      total: 5,
      likes: 3,
      comments: 2,
      follows: 0,
      mentions: 0,
      reposts: 0,
      system: 0,
    });
  });

  it('updates active filter', () => {
    useNotificationStore.getState().setActiveFilter('comments');
    expect(useNotificationStore.getState().activeFilter).toBe('comments');
  });

  it('tracks optimistic follow state with loading guard', () => {
    useNotificationStore.getState().setOptimisticFollow('user-1', true, true);
    expect(useNotificationStore.getState().optimisticFollows['user-1']).toEqual({
      isFollowing: true,
      isLoading: true,
    });
  });

  it('resets unread count for specific filter', () => {
    useNotificationStore.getState().setUnreadCounts({ total: 5, likes: 3, comments: 2 });
    useNotificationStore.getState().resetUnreadCountForFilter('likes');

    expect(useNotificationStore.getState().unreadCounts).toEqual({
      total: 2,
      likes: 0,
      comments: 2,
      follows: 0,
      mentions: 0,
      reposts: 0,
      system: 0,
    });
  });

  it('resets all unread counts when filter is all', () => {
    useNotificationStore.getState().setUnreadCounts({ total: 5, likes: 3, comments: 2 });
    useNotificationStore.getState().resetUnreadCountForFilter('all');

    expect(useNotificationStore.getState().unreadCounts.total).toBe(0);
  });

  it('handles resetUnreadCountForFilter with undefined category count and default isLoading in setOptimisticFollow', () => {
    useNotificationStore.getState().setOptimisticFollow('user-2', false);
    expect(useNotificationStore.getState().optimisticFollows['user-2']).toEqual({
      isFollowing: false,
      isLoading: false,
    });

    useNotificationStore.setState({
      unreadCounts: { total: 4 } as any,
    });
    useNotificationStore.getState().resetUnreadCountForFilter('mentions');
    expect(useNotificationStore.getState().unreadCounts.mentions).toBe(0);
  });
});
