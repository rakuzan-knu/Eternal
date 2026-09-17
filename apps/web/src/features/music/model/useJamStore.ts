import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

export type JamQueuePolicy = 'dj_only' | 'open_queue';
export type JamRoomStatus = 'active' | 'reconnecting';

export interface JamListener {
  id: string;
  username: string;
  avatar?: string;
  isHost?: boolean;
}

export interface JamState {
  // Session details
  roomId: string | null;
  hostUserId: string | null;
  hostUsername: string | null;
  hostAvatar: string | null;
  isHost: boolean;
  isJamActive: boolean;
  roomStatus: JamRoomStatus;
  queuePolicy: JamQueuePolicy;
  listeners: JamListener[];
  roomQueue: SpotifyTrack[];

  // Clock sync (Cristian's algorithm) & Network metrics
  serverTimeOffset: number; // currentServerTime = Date.now() + serverTimeOffset
  latency: number; // RTT / 2

  // Listener local interaction states
  isPausedLocally: boolean;
  isAutoplayBlocked: boolean;
  preloadedTrackId: string | null;

  // UI States
  isJamPopoverOpen: boolean;

  // Actions
  setRoomState: (room: any, currentUserId?: string) => void;
  setListeners: (listeners: JamListener[]) => void;
  setQueuePolicy: (policy: JamQueuePolicy) => void;
  setRoomQueue: (queue: SpotifyTrack[]) => void;
  setJamPopoverOpen: (open: boolean) => void;
  toggleJamPopover: () => void;
  setPausedLocally: (paused: boolean) => void;
  setAutoplayBlocked: (blocked: boolean) => void;
  setServerTimeOffset: (offset: number) => void;
  setLatency: (latency: number) => void;
  setPreloadedTrackId: (trackId: string | null) => void;
  resetJam: () => void;
}

export const useJamStore = create<JamState>((set, get) => ({
  roomId: null,
  hostUserId: null,
  hostUsername: null,
  hostAvatar: null,
  isHost: false,
  isJamActive: false,
  roomStatus: 'active',
  queuePolicy: 'dj_only',
  listeners: [],
  roomQueue: [],

  serverTimeOffset: 0,
  latency: 0,

  isPausedLocally: false,
  isAutoplayBlocked: false,
  preloadedTrackId: null,

  isJamPopoverOpen: false,

  setRoomState: (room: any, currentUserId?: string) => {
    if (!room) return;
    const isHost = currentUserId ? room.hostUserId === currentUserId : get().isHost;
    set({
      roomId: room.roomId || room.id || null,
      hostUserId: room.hostUserId,
      hostUsername: room.hostUsername,
      hostAvatar: room.hostAvatar || null,
      isHost,
      isJamActive: true,
      roomStatus: room.status || 'active',
      queuePolicy: room.queuePolicy || 'dj_only',
      listeners: Array.isArray(room.listeners) ? room.listeners : [],
      roomQueue: Array.isArray(room.queue) ? room.queue : [],
    });
  },

  setListeners: (listeners) => set({ listeners }),

  setQueuePolicy: (queuePolicy) => set({ queuePolicy }),

  setRoomQueue: (roomQueue) => set({ roomQueue }),

  setJamPopoverOpen: (isJamPopoverOpen) => set({ isJamPopoverOpen }),

  toggleJamPopover: () => set((state) => ({ isJamPopoverOpen: !state.isJamPopoverOpen })),

  setPausedLocally: (isPausedLocally) => set({ isPausedLocally }),

  setAutoplayBlocked: (isAutoplayBlocked) => set({ isAutoplayBlocked }),

  setServerTimeOffset: (serverTimeOffset) => set({ serverTimeOffset }),

  setLatency: (latency) => set({ latency }),

  setPreloadedTrackId: (preloadedTrackId) => set({ preloadedTrackId }),

  resetJam: () =>
    set({
      roomId: null,
      hostUserId: null,
      hostUsername: null,
      hostAvatar: null,
      isHost: false,
      isJamActive: false,
      roomStatus: 'active',
      queuePolicy: 'dj_only',
      listeners: [],
      roomQueue: [],
      isPausedLocally: false,
      isAutoplayBlocked: false,
      preloadedTrackId: null,
      isJamPopoverOpen: false,
      latency: 0,
    }),
}));

/** RESET_STORES: leave jam room state on logout/switch (socket rejoins). */
registerSessionResetHandler(() => {
  useJamStore.getState().resetJam();
});
