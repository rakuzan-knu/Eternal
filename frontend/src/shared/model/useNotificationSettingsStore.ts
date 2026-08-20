import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  muteNotificationAuthor,
  unmuteNotificationAuthor,
  updateNotificationSettings,
} from '@/entities/notification/api/notificationApi';

export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MutedActorItem {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  isVerified?: boolean;
}

export interface NotificationSettingsState {
  enableNotifications: boolean;
  allowSound: boolean;
  volume: number; // 0 to 100
  showName: boolean;
  showText: boolean;
  privateChats: boolean;
  groups: boolean;
  reactions: boolean;
  likes: boolean;
  comments: boolean;
  reposts: boolean;
  followers: boolean;
  mentions: boolean;
  system: boolean;
  toastPosition: NotificationPosition;
  maxToasts: number; // 1 to 5
  dndUntil: string | null;
  mutedActorIds: string[];
  mutedActors: MutedActorItem[];

  setEnableNotifications: (val: boolean) => void;
  setAllowSound: (val: boolean) => void;
  setVolume: (val: number) => void;
  setShowName: (val: boolean) => void;
  setShowText: (val: boolean) => void;
  setPrivateChats: (val: boolean) => void;
  setGroups: (val: boolean) => void;
  setReactions: (val: boolean) => void;
  setLikes: (val: boolean) => void;
  setComments: (val: boolean) => void;
  setReposts: (val: boolean) => void;
  setFollowers: (val: boolean) => void;
  setMentions: (val: boolean) => void;
  setSystem: (val: boolean) => void;
  setToastPosition: (pos: NotificationPosition) => void;
  setMaxToasts: (count: number) => void;
  setDoNotDisturb: (preset: 'off' | '1h' | '8h' | 'tomorrow' | null) => void;
  muteAuthor: (actorId: string, actorInfo?: MutedActorItem) => Promise<void>;
  unmuteAuthor: (actorId: string) => Promise<void>;
  setAllSettings: (settings: Partial<NotificationSettingsState>) => void;
}

const syncToBackend = (patch: Record<string, any>) => {
  updateNotificationSettings(patch).catch(() => {});
};

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set, get) => ({
      enableNotifications: true,
      allowSound: true,
      volume: 100,
      showName: true,
      showText: true,
      privateChats: true,
      groups: true,
      reactions: true,
      likes: true,
      comments: true,
      reposts: true,
      followers: true,
      mentions: true,
      system: true,
      toastPosition: 'bottom-right',
      maxToasts: 3,
      dndUntil: null,
      mutedActorIds: [],
      mutedActors: [],

      setEnableNotifications: (enableNotifications) => {
        set({ enableNotifications });
        syncToBackend({ enableNotifications });
      },
      setAllowSound: (allowSound) => {
        set({ allowSound });
        syncToBackend({ allowSound });
      },
      setVolume: (volume) => {
        const safeVolume = Math.max(0, Math.min(100, volume));
        set({ volume: safeVolume });
        syncToBackend({ volume: safeVolume });
      },

      setShowName: (showName) =>
        set(() => {
          if (!showName) {
            syncToBackend({ showName: false, showText: false });
            return { showName: false, showText: false };
          }
          syncToBackend({ showName: true });
          return { showName: true };
        }),

      setShowText: (showText) =>
        set((state) => {
          if (!state.showName && showText) {
            syncToBackend({ showName: true, showText: true });
            return { showName: true, showText: true };
          }
          syncToBackend({ showText });
          return { showText };
        }),

      setPrivateChats: (privateChats) => {
        set({ privateChats });
        syncToBackend({ privateChats });
      },
      setGroups: (groups) => {
        set({ groups });
        syncToBackend({ groups });
      },
      setReactions: (reactions) => {
        set({ reactions });
        syncToBackend({ reactions });
      },
      setLikes: (likes) => {
        set({ likes });
        syncToBackend({ likes });
      },
      setComments: (comments) => {
        set({ comments });
        syncToBackend({ comments });
      },
      setReposts: (reposts) => {
        set({ reposts });
        syncToBackend({ reposts });
      },
      setFollowers: (followers) => {
        set({ followers });
        syncToBackend({ followers });
      },
      setMentions: (mentions) => {
        set({ mentions });
        syncToBackend({ mentions });
      },
      setSystem: (system) => {
        set({ system });
        syncToBackend({ system });
      },
      setToastPosition: (toastPosition) => {
        set({ toastPosition });
        syncToBackend({ toastPosition });
      },
      setMaxToasts: (maxToasts) => {
        const safeMax = Math.max(1, Math.min(5, maxToasts));
        set({ maxToasts: safeMax });
        syncToBackend({ maxToasts: safeMax });
      },

      setDoNotDisturb: (preset) => {
        let dndUntil: string | null = null;
        const now = new Date();

        if (preset === '1h') {
          dndUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        } else if (preset === '8h') {
          dndUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
        } else if (preset === 'tomorrow') {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(8, 0, 0, 0);
          dndUntil = tomorrow.toISOString();
        }

        set({ dndUntil });
        syncToBackend({ dndUntil });
      },

      muteAuthor: async (actorId, actorInfo) => {
        const current = get();
        const setIds = new Set(current.mutedActorIds);
        setIds.add(actorId);
        const updatedActors = actorInfo
          ? [...current.mutedActors.filter((a) => a.id !== actorId), actorInfo]
          : current.mutedActors;

        set({
          mutedActorIds: Array.from(setIds),
          mutedActors: updatedActors,
        });

        try {
          await muteNotificationAuthor(actorId);
        } catch {
          // Revert or fallback
        }
      },

      unmuteAuthor: async (actorId) => {
        const current = get();
        set({
          mutedActorIds: current.mutedActorIds.filter((id) => id !== actorId),
          mutedActors: current.mutedActors.filter((a) => a.id !== actorId),
        });

        try {
          await unmuteNotificationAuthor(actorId);
        } catch {
          // Fallback
        }
      },

      setAllSettings: (settings) => set(settings),
    }),
    {
      name: 'notification-settings-storage',
    },
  ),
);
