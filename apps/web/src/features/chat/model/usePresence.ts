import { useEffect } from 'react';
import { useChatSocket } from './useChatSocket';
import { usePresenceStore } from '@/shared/model/usePresenceStore';

export function usePresenceSync() {
  const socket = useChatSocket();
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

    socket.on('userOnline', handleOnline);
    socket.on('userOffline', handleOffline);
    socket.on('presence:batch', handleBatch);
    socket.on('user:activity:changed', handleActivityChanged);

    return () => {
      socket.off('userOnline', handleOnline);
      socket.off('userOffline', handleOffline);
      socket.off('presence:batch', handleBatch);
      socket.off('user:activity:changed', handleActivityChanged);
    };
  }, [socket, setOnline, setOffline, applyBatch, setUserActivity]);
}

export function useQueryOnlineStatus(userIds: string[]) {
  const socket = useChatSocket();
  const setKnownStatuses = usePresenceStore((s) => s.setKnownStatuses);
  const setUserActivities = usePresenceStore((s) => s.setUserActivities);
  const key = userIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;
    const requestedIds = key.split(',');
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
  }, [key, socket, setKnownStatuses, setUserActivities]);
}
