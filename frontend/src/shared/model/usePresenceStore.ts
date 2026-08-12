import { create } from 'zustand';

interface PresenceState {
  onlineUserIds: Set<string>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  setBulk: (userIds: string[]) => void;
  setKnownStatuses: (userIds: string[], onlineUserIds: string[]) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUserIds: new Set(),
  setOnline: (userId) =>
    set((state) => ({ onlineUserIds: new Set(state.onlineUserIds).add(userId) })),
  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    }),
  setBulk: (userIds) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      userIds.forEach((id) => next.add(id));
      return { onlineUserIds: next };
    }),
  setKnownStatuses: (userIds, onlineUserIds) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      userIds.forEach((id) => next.delete(id));
      onlineUserIds.forEach((id) => next.add(id));
      return { onlineUserIds: next };
    }),
}));
