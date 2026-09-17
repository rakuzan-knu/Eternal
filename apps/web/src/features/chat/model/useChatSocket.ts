import { useEffect } from 'react';
import { getSocket } from '@/shared/api/socket';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useChatSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socket = getSocket();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!socket.connected) socket.connect();
  }, [isAuthenticated, socket]);

  return socket;
}
