import { create } from 'zustand';

export interface UserActivityStatus {
  type?: string | null;
  isSteam?: boolean | null;
  title?: string | null;
  subtitle?: string | null;
  gameId?: string | null;
  appName?: string | null;
  imageUrl?: string | null;
  startedAt?: number | null;
  externalUrl?: string | null;
  playtimeHours?: number | null;
  [key: string]: any;
}

interface PresenceState {
  onlineUserIds: Set<string>;
  userActivities: Record<string, UserActivityStatus | null>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  setBulk: (userIds: string[]) => void;
  setKnownStatuses: (userIds: string[], onlineUserIds: string[]) => void;
  applyBatch: (onlineUserIds: string[], offlineUserIds: string[]) => void;
  setUserActivity: (userId: string, activityStatus: any) => void;
  setUserActivities: (activities: Record<string, any>) => void;
  applyUserUpdates: (updates: ReadonlyMap<string, PresenceUpdate>) => void;
}

export interface PresenceUpdate {
  online?: boolean;
  activity?: UserActivityStatus | null;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUserIds: new Set(),
  userActivities: {},
  setOnline: (userId) =>
    set((state) => ({ onlineUserIds: new Set(state.onlineUserIds).add(userId) })),
  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      const nextActivities = { ...state.userActivities };
      delete nextActivities[userId];
      return { onlineUserIds: next, userActivities: nextActivities };
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
  applyBatch: (onlineUserIds, offlineUserIds) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      offlineUserIds.forEach((id) => next.delete(id));
      onlineUserIds.forEach((id) => next.add(id));
      return { onlineUserIds: next };
    }),
  setUserActivity: (userId, activityStatus) =>
    set((state) => ({
      userActivities: {
        ...state.userActivities,
        [userId]: activityStatus,
      },
    })),
  setUserActivities: (activities) =>
    set((state) => ({
      userActivities: {
        ...state.userActivities,
        ...activities,
      },
    })),
  applyUserUpdates: (updates) =>
    set((state) => {
      let onlineUserIds = state.onlineUserIds;
      let userActivities = state.userActivities;
      for (const [userId, update] of updates) {
        if (update.online !== undefined && onlineUserIds.has(userId) !== update.online) {
          if (onlineUserIds === state.onlineUserIds) onlineUserIds = new Set(onlineUserIds);
          if (update.online) onlineUserIds.add(userId);
          else onlineUserIds.delete(userId);
        }
        if (update.activity === undefined) continue;
        if (update.activity === null) {
          if (!(userId in userActivities)) continue;
          if (userActivities === state.userActivities) userActivities = { ...userActivities };
          delete userActivities[userId];
        } else if (userActivities[userId] !== update.activity) {
          if (userActivities === state.userActivities) userActivities = { ...userActivities };
          userActivities[userId] = update.activity;
        }
      }
      if (onlineUserIds === state.onlineUserIds && userActivities === state.userActivities)
        return state;
      return { onlineUserIds, userActivities };
    }),
}));
