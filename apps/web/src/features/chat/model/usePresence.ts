import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { usePresenceStore, type PresenceUpdate } from '@/shared/model/usePresenceStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useActiveDecorationStore } from '@/shared/model/useActiveDecorationStore';
import type { AvatarDecorationDto, NameplateDto } from '@social-network/shared-contracts';
import { createSocketStateBatch } from './socketStateBatch';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

export function usePresenceSync() {
  const accountId = useAuthStore((state) => state.userId);
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const applyUserUpdates = usePresenceStore((s) => s.applyUserUpdates);

  useEffect(() => {
    const batch = createSocketStateBatch<PresenceUpdate>(applyUserUpdates);
    const unregisterReset = registerSessionResetHandler(batch.dispose);
    const handleOnline = ({ userId }: { userId: string }) =>
      batch.enqueue(userId, (previous) => ({ ...previous, online: true }));
    const handleOffline = ({ userId }: { userId: string }) => {
      batch.enqueue(userId, () => ({ online: false, activity: null }));
    };
    const handleBatch = ({
      online = [],
      offline = [],
    }: {
      online?: string[];
      offline?: string[];
    }) => {
      const changes = function* () {
        for (const userId of offline)
          yield [userId, () => ({ online: false, activity: null })] as const;
        for (const userId of online)
          yield [
            userId,
            (previous: PresenceUpdate | undefined) => ({ ...previous, online: true }),
          ] as const;
      };
      batch.enqueueMany(changes());
    };
    const handleActivityChanged = ({
      userId,
      activityStatus,
    }: {
      userId: string;
      activityStatus: any;
    }) => {
      batch.enqueue(userId, (previous) => ({ ...previous, activity: activityStatus }));
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
    socket.on('disconnect', batch.flush);

    return () => {
      unregisterReset();
      batch.dispose();
      socket.off('userOnline', handleOnline);
      socket.off('userOffline', handleOffline);
      socket.off('presence:batch', handleBatch);
      socket.off('user:activity:changed', handleActivityChanged);
      socket.off('user:customization:updated', handleCustomizationUpdated);
      socket.off('disconnect', batch.flush);
    };
  }, [socket, applyUserUpdates, queryClient, accountId]);
}

export function useQueryOnlineStatus(userIds: string[]) {
  const socket = useChatSocket();
  const setKnownStatuses = usePresenceStore((s) => s.setKnownStatuses);
  const setUserActivities = usePresenceStore((s) => s.setUserActivities);
  const key = userIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;
    const requestedIds = key.split(',');
    let disposed = false;
    let pending = false;

    const query = () => {
      // Presence is replaceable state: never queue reads offline or accumulate
      // callbacks while the server is slow. Socket.IO removes timed-out acks.
      if (disposed || pending || !socket.connected || document.hidden) return;
      pending = true;
      socket
        .timeout(8000)
        .emit(
          'getOnlineStatus',
          { userIds: requestedIds },
          (
            error: Error | null,
            res?: { status: string; online?: string[]; activities?: Record<string, any> },
          ) => {
            pending = false;
            if (disposed || error) return;
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
      disposed = true;
      socket.off('connect', query);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [key, socket, setKnownStatuses, setUserActivities]);
}
