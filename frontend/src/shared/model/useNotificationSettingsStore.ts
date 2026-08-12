import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface NotificationSettingsState {
  enableNotifications: boolean;
  allowSound: boolean;
  volume: number; // 0 to 100
  showName: boolean;
  showText: boolean;
  privateChats: boolean;
  groups: boolean;
  reactions: boolean;
  toastPosition: NotificationPosition;
  maxToasts: number; // 1 to 5

  setEnableNotifications: (val: boolean) => void;
  setAllowSound: (val: boolean) => void;
  setVolume: (val: number) => void;
  setShowName: (val: boolean) => void;
  setShowText: (val: boolean) => void;
  setPrivateChats: (val: boolean) => void;
  setGroups: (val: boolean) => void;
  setReactions: (val: boolean) => void;
  setToastPosition: (pos: NotificationPosition) => void;
  setMaxToasts: (count: number) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      enableNotifications: true,
      allowSound: true,
      volume: 100,
      showName: true,
      showText: true,
      privateChats: true,
      groups: true,
      reactions: true,
      toastPosition: 'bottom-right',
      maxToasts: 3,

      setEnableNotifications: (enableNotifications) => set({ enableNotifications }),
      setAllowSound: (allowSound) => set({ allowSound }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),

      setShowName: (showName) =>
        set(() => {
          if (!showName) {
            return { showName: false, showText: false };
          }
          return { showName: true };
        }),

      setShowText: (showText) =>
        set((state) => {
          if (!state.showName && showText) {
            return { showName: true, showText: true };
          }
          return { showText };
        }),

      setPrivateChats: (privateChats) => set({ privateChats }),
      setGroups: (groups) => set({ groups }),
      setReactions: (reactions) => set({ reactions }),
      setToastPosition: (toastPosition) => set({ toastPosition }),
      setMaxToasts: (maxToasts) => set({ maxToasts: Math.max(1, Math.min(5, maxToasts)) }),
    }),
    {
      name: 'notification-settings-storage',
    },
  ),
);
