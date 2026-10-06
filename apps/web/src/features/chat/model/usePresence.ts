import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';
import type { AvatarDecorationDto, NameplateDto } from '@social-network/shared-contracts';

export function usePresenceSync() {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const setOnline = usePresenceStore((s) => s.setOnline);
  const setOffline = usePresenceStore((s) => s.setOffline);
  const applyBatch = usePresenceStore((s) => s.applyBatch);
  const setUserActivity = usePresenceStore((s) => s.setUserActivity);

  useEffect(() => {
    const handleOnline = ({ userId }: { userId: string }) => setOnline(userId);
    const handleOffline = ({ userId }: { userId: string }) => {
      setOffline(userId);
      setUserActivity(userId, null);
    };
    const handleBatch = ({
      online = [],
      offline = [],
    }: {
      online?: string[];
      offline?: string[];
    }) => applyBatch(online, offline);
    const handleActivityChanged = ({
      userId,
      activityStatus,
    }: {
      userId: string;
      activityStatus: any;
    }) => {
      setUserActivity(userId, activityStatus);
    };

    const handleCustomizationUpdated = (payload: {
      userId: string;
      activeDecorationId?: string | null;
      activeDecoration?: AvatarDecorationDto | null;
      activeNameplateId?: string | null;
      activeNameplate?: NameplateDto | null;
    }) => {
      if (!payload?.userId) return;
      const currentUserId = useAuthStore.getState().userId;
      if (payload.userId === currentUserId) {
        if (payload.activeDecoration !== undefined) {
          useActiveDecorationStore.getState().setActiveDecoration(payload.activeDecoration);
        }
        if (payload.activeNameplate !== undefined) {
          useActiveDecorationStore.getState().setActiveNameplate(payload.activeNameplate);
        }
      }

      void queryClient.invalidateQueries({
        predicate: (q) =>
          [
            'user',
            'profile',
            'friends',
            'followList',
            'suggestedUsers',
            'user-search',
            'conversations',
            'conversation',
            'conversations-search',
            'decorations',
            'nameplates',
            'miniProfile',
            'profile-frame-inventory',
            'profile-effect-inventory',
          ].includes(String(q.queryKey[0])),
      });
    };

    socket.on('userOnline', handleOnline);
    socket.on('userOffline', handleOffline);
    socket.on('presence:batch', handleBatch);
    socket.on('user:activity:changed', handleActivityChanged);
    socket.on('user:customization:updated', handleCustomizationUpdated);

    return () => {
      socket.off('userOnline', handleOnline);
      socket.off('userOffline', handleOffline);
      socket.off('presence:batch', handleBatch);
      socket.off('user:activity:changed', handleActivityChanged);
      socket.off('user:customization:updated', handleCustomizationUpdated);
    };
  }, [socket, setOnline, setOffline, applyBatch, setUserActivity, queryClient]);
}

export function useQueryOnlineStatus(userIds: string[]) {
  const socket = useChatSocket();
  const setKnownStatuses = usePresenceStore((s) => s.setKnownStatuses);
  const setUserActivities = usePresenceStore((s) => s.setUserActivities);
  const key = userIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;
    const requestedIds = key.split(',');

    const query = () => {
      socket.emit(
        'getOnlineStatus',
        { userIds: requestedIds },
        (res: { status: string; online?: string[]; activities?: Record<string, any> }) => {
          if (res?.status === 'ok') {
            if (res.online) setKnownStatuses(requestedIds, res.online);
            if (res.activities) setUserActivities(res.activities);
          }
        },
      );
    };

    // 1. Initial query
    query();

    // 2. Query when socket connects / reconnects
    socket.on('connect', query);

    // 3. Periodic refresh to reconcile any missed transitions (every 10s)
    const interval = setInterval(() => {
      if (socket.connected) {
        query();
      }
    }, 10_000);

    // 4. Query when user focuses tab
    const handleFocus = () => {
      if (socket.connected) {
        query();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      socket.off('connect', query);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [key, socket, setKnownStatuses, setUserActivities]);
}
