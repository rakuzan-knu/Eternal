import { create } from 'zustand';
import type { WatchTogetherVideoItem } from '../api/watchTogetherApi';

export interface WatchTogetherViewer {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface WatchTogetherActiveActivity {
  conversationId: string;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar?: string | null;
  media: WatchTogetherVideoItem;
  timestamp: number;
  isPlaying: boolean;
}

interface WatchTogetherState {
  // Activity invitation banner across chat & calls
  activeActivity: WatchTogetherActiveActivity | null;
  dismissedActivities: Record<string, boolean>;

  // Current session media & playback
  activeMedia: WatchTogetherVideoItem | null;
  currentTime: number;
  isPlaying: boolean;

  // Viewers currently in the session
  activeViewers: WatchTogetherViewer[];

  // Room queue
  roomQueue: WatchTogetherVideoItem[];

  // Actions
  setActiveActivity: (activity: WatchTogetherActiveActivity | null) => void;
  dismissActivity: (conversationId: string) => void;
  clearDismissed: (conversationId: string) => void;

  setActiveMedia: (media: WatchTogetherVideoItem | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;

  setActiveViewers: (viewers: WatchTogetherViewer[]) => void;
  addViewer: (viewer: WatchTogetherViewer) => void;
  removeViewer: (userId: string) => void;

  setRoomQueue: (queue: WatchTogetherVideoItem[]) => void;
  addToQueue: (item: WatchTogetherVideoItem) => void;
  removeFromQueue: (id: string) => void;

  resetAll: () => void;
}

export const useWatchTogetherStore = create<WatchTogetherState>()((set) => ({
  activeActivity: null,
  dismissedActivities: {},

  activeMedia: null,
  currentTime: 0,
  isPlaying: false,

  activeViewers: [],
  roomQueue: [],

  setActiveActivity: (activeActivity) => set({ activeActivity }),

  dismissActivity: (conversationId) =>
    set((state) => ({
      dismissedActivities: { ...state.dismissedActivities, [conversationId]: true },
    })),

  clearDismissed: (conversationId) =>
    set((state) => {
      const next = { ...state.dismissedActivities };
      delete next[conversationId];
      return { dismissedActivities: next };
    }),

  setActiveMedia: (activeMedia) => set({ activeMedia }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setActiveViewers: (activeViewers) => set({ activeViewers }),

  addViewer: (viewer) =>
    set((state) => {
      if (state.activeViewers.some((v) => v.id === viewer.id)) {
        return {
          activeViewers: state.activeViewers.map((v) =>
            v.id === viewer.id ? { ...v, ...viewer } : v,
          ),
        };
      }
      return { activeViewers: [...state.activeViewers, viewer] };
    }),

  removeViewer: (userId) =>
    set((state) => ({
      activeViewers: state.activeViewers.filter((v) => v.id !== userId),
    })),

  setRoomQueue: (roomQueue) => set({ roomQueue }),

  addToQueue: (item) =>
    set((state) => {
      if (state.roomQueue.some((q) => q.id === item.id)) return state;
      return { roomQueue: [...state.roomQueue, item] };
    }),

  removeFromQueue: (id) =>
    set((state) => ({
      roomQueue: state.roomQueue.filter((item) => item.id !== id),
    })),

  resetAll: () =>
    set({
      activeActivity: null,
      dismissedActivities: {},
      activeMedia: null,
      currentTime: 0,
      isPlaying: false,
      activeViewers: [],
      roomQueue: [],
    }),
}));
