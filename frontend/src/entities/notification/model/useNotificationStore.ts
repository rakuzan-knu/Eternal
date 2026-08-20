import { create } from 'zustand';
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
        ...state.unreadCounts,
        ...counts,
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
      const currentCategoryCount = state.unreadCounts[filter] || 0;
      const newTotal = Math.max(0, state.unreadCounts.total - currentCategoryCount);
      return {
        unreadCounts: {
          ...state.unreadCounts,
          total: newTotal,
          [filter]: 0,
        },
      };
    }),
}));
