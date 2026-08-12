import { useEffect } from 'react';
import { getSocket } from '@/shared/api/socket';
import { useAuthStore } from '@/shared/model/useAuthStore';

export function useChatSocket() {
  const { isAuthenticated } = useAuthStore();
  const socket = getSocket();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!socket.connected) socket.connect();
  }, [isAuthenticated, socket]);

  return socket;
}
