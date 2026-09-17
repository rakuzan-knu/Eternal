import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import { NotificationFilter, NotificationUnreadCounts } from './types';

interface NotificationState {
  unreadCounts: NotificationUnreadCounts;
  activeFilter: NotificationFilter;
  optimisticFollows: Record<string, { isFollowing: boolean; isLoading: boolean }>;
  setUnreadCounts: (counts: Partial<NotificationUnreadCounts>) => void;
  setActiveFilter: (filter: NotificationFilter) => void;
  setOptimisticFollow: (userId: string, isFollowing: boolean, isLoading?: boolean) => void;
  resetUnreadCountForFilter: (filter: NotificationFilter) => void;
}

const initialCounts: NotificationUnreadCounts = {
  total: 0,
  likes: 0,
  comments: 0,
  follows: 0,
  mentions: 0,
  reposts: 0,
  system: 0,
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCounts: initialCounts,
  activeFilter: 'all',
  optimisticFollows: {},

  setUnreadCounts: (counts) =>
    set((state) => ({
      unreadCounts: {
        total: (counts.total !== undefined ? counts.total : state.unreadCounts.total) | 0,
        likes: (counts.likes !== undefined ? counts.likes : state.unreadCounts.likes) | 0,
        comments:
          (counts.comments !== undefined ? counts.comments : state.unreadCounts.comments) | 0,
        follows: (counts.follows !== undefined ? counts.follows : state.unreadCounts.follows) | 0,
        mentions:
          (counts.mentions !== undefined ? counts.mentions : state.unreadCounts.mentions) | 0,
        reposts: (counts.reposts !== undefined ? counts.reposts : state.unreadCounts.reposts) | 0,
        system: (counts.system !== undefined ? counts.system : state.unreadCounts.system) | 0,
      },
    })),

  setActiveFilter: (filter) => set({ activeFilter: filter }),

  setOptimisticFollow: (userId, isFollowing, isLoading = false) =>
    set((state) => ({
      optimisticFollows: {
        ...state.optimisticFollows,
        [userId]: { isFollowing, isLoading },
      },
    })),

  resetUnreadCountForFilter: (filter) =>
    set((state) => {
      if (filter === 'all') {
        return { unreadCounts: { ...initialCounts } };
      }
      const currentCategoryCount = (state.unreadCounts[filter] || 0) | 0;
      const newTotal = Math.max(0, state.unreadCounts.total - currentCategoryCount) | 0;
      return {
        unreadCounts: {
          total: newTotal,
          likes: filter === 'likes' ? 0 : state.unreadCounts.likes | 0,
          comments: filter === 'comments' ? 0 : state.unreadCounts.comments | 0,
          follows: filter === 'follows' ? 0 : state.unreadCounts.follows | 0,
          mentions: filter === 'mentions' ? 0 : state.unreadCounts.mentions | 0,
          reposts: filter === 'reposts' ? 0 : state.unreadCounts.reposts | 0,
          system: filter === 'system' ? 0 : state.unreadCounts.system | 0,
        },
      };
    }),
}));

/**
 * RESET_STORES: unread counts/filter are session-scoped (source of truth is
 * TanStack Query `unread-notifications-count`; this store is an optimistic
 * projection). Cleared on logout/switch to prevent cross-account leakage.
 */
registerSessionResetHandler(() => {
  useNotificationStore.setState({
    unreadCounts: { ...initialCounts },
    activeFilter: 'all',
    optimisticFollows: {},
  });
});
