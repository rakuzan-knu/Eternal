import { useEffect } from 'react';
import { useChatSocket } from './useChatSocket';

export function useChatSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const socket = useChatSocket();

  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
