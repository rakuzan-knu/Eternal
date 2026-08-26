import { create } from 'zustand';

export interface ActiveMediaInfo {
  id: string;
  mediaType: 'voice' | 'video';
  url: string;
  senderName: string;
  senderAvatar?: string | null;
  conversationId?: string | null;
  conversationTitle?: string | null;
  sentAt?: string | null;
  duration?: number;
}

interface ActiveMediaPlaybackState {
  activeMediaId: string | null;
  mediaType: 'voice' | 'video' | null;
  url: string | null;
  senderName: string | null;
  senderAvatar: string | null;
  conversationId: string | null;
  conversationTitle: string | null;
  sentAt: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  volume: number; // 0.0 - 1.0
  playbackRate: number; // 0.5, 1.0, 1.2, 1.5, 1.7, 2.0
  seekTarget: number | null; // seek trigger

  // Playlist queue & Context isolation
  playlist: ActiveMediaInfo[];
  currentIndex: number;
  nextIndicator: string | null; // "Next: [Author]" transient notice

  // PiP state
  isPiPVisible: boolean;
  currentViewingChatId: string | null;

  // Actions
  setActiveMedia: (info: ActiveMediaInfo) => void;
  setActiveMediaId: (id: string | null) => void;
  setPlaylist: (items: ActiveMediaInfo[], conversationId?: string) => void;
  playNext: () => boolean;
  playPrev: () => boolean;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  setNextIndicator: (text: string | null) => void;
  setCurrentViewingChatId: (chatId: string | null) => void;
  setPiPVisible: (visible: boolean) => void;
  stopAll: () => void;
}

export const useActiveMediaPlaybackStore = create<ActiveMediaPlaybackState>((set, get) => ({
  activeMediaId: null,
  mediaType: null,
  url: null,
  senderName: null,
  senderAvatar: null,
  conversationId: null,
  conversationTitle: null,
  sentAt: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isLoading: false,
  isMuted: false,
  volume: 1,
  playbackRate: 1,
  seekTarget: null,

  playlist: [],
  currentIndex: -1,
  nextIndicator: null,

  isPiPVisible: false,
  currentViewingChatId: null,

  setActiveMedia: (info) => {
    const { playlist } = get();
    let index = playlist.findIndex((item) => item.id === info.id);
    let newPlaylist = playlist;

    // Context Isolation: if changing conversation, initialize new playlist with this item
    if (info.conversationId && info.conversationId !== get().conversationId) {
      newPlaylist = [info];
      index = 0;
    } else if (index === -1) {
      newPlaylist = [...playlist, info];
      index = newPlaylist.length - 1;
    }

    set({
      activeMediaId: info.id,
      mediaType: info.mediaType,
      url: info.url,
      senderName: info.senderName,
      senderAvatar: info.senderAvatar ?? null,
      conversationId: info.conversationId ?? get().conversationId,
      conversationTitle: info.conversationTitle ?? get().conversationTitle,
      sentAt: info.sentAt ?? null,
      duration: info.duration ?? 0,
      isPlaying: true,
      isLoading: true,
      isMuted: false,
      currentTime: 0,
      seekTarget: null,
      playlist: newPlaylist,
      currentIndex: index,
    });
  },

  setActiveMediaId: (id) => {
    if (!id) {
      set({
        activeMediaId: null,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        seekTarget: null,
        isPiPVisible: false,
      });
    } else {
      set({ activeMediaId: id });
    }
  },

  setPlaylist: (items, conversationId) => {
    const state = get();
    // Only replace if matching current playback conversation or empty
    if (!state.conversationId || state.conversationId === conversationId || !conversationId) {
      const idx = items.findIndex((i) => i.id === state.activeMediaId);
      set({
        playlist: items,
        currentIndex: idx,
        conversationId: conversationId ?? state.conversationId,
      });
    }
  },

  playNext: () => {
    const { playlist, currentIndex } = get();
    if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
      const nextItem = playlist[currentIndex + 1];
      set({
        nextIndicator: `Next: ${nextItem.senderName}`,
      });

      // Clear indicator after 1.2 seconds
      setTimeout(() => {
        if (get().nextIndicator) {
          set({ nextIndicator: null });
        }
      }, 1200);

      get().setActiveMedia(nextItem);
      return true;
    }
    return false;
  },

  playPrev: () => {
    const { playlist, currentIndex } = get();
    if (currentIndex > 0) {
      const prevItem = playlist[currentIndex - 1];
      get().setActiveMedia(prevItem);
      return true;
    }
    // If first item, seek to start
    get().seek(0);
    return false;
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  setIsMuted: (isMuted) => set({ isMuted }),

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },

  seek: (time) => {
    const { duration } = get();
    const clamped = Math.max(0, Math.min(duration || Infinity, time));
    set({ currentTime: clamped, seekTarget: clamped });
  },

  seekRelative: (deltaSeconds) => {
    const { currentTime, duration } = get();
    const target = Math.max(0, Math.min(duration || Infinity, currentTime + deltaSeconds));
    set({ currentTime: target, seekTarget: target });
  },

  setNextIndicator: (nextIndicator) => set({ nextIndicator }),
  setCurrentViewingChatId: (currentViewingChatId) => set({ currentViewingChatId }),
  setPiPVisible: (isPiPVisible) => set({ isPiPVisible }),

  stopAll: () =>
    set({
      activeMediaId: null,
      mediaType: null,
      url: null,
      senderName: null,
      senderAvatar: null,
      sentAt: null,
      currentTime: 0,
      isPlaying: false,
      isLoading: false,
      seekTarget: null,
      playlist: [],
      currentIndex: -1,
      nextIndicator: null,
      isPiPVisible: false,
    }),
}));
