import { io, Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { connectionManager } from './connectionManager';
import { getValidAccessToken, isTokenExpired } from './httpClient';

let socket: Socket | null = null;
let isManagerSubscribed = false;

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return apiUrl
    .replace(/\/v1\/?$/, '')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '');
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(`${getSocketBaseUrl()}/messenger`, {
    parser: msgpackParser,
    autoConnect: true,
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    auth: (cb) => {
      const token = localStorage.getItem('accessToken');
      if (token && isTokenExpired(token) && localStorage.getItem('refreshToken')) {
        void getValidAccessToken();
      }
      cb({ token });
    },
  });

  socket.on('connect_error', (err) => {
    if (
      err?.message?.includes('token') ||
      err?.message?.includes('jwt') ||
      err?.message?.includes('auth') ||
      err?.message?.includes('unauthorized')
    ) {
      void getValidAccessToken().then((newToken) => {
        if (newToken && socket) {
          socket.connect();
        }
      });
    }
  });

  if (!isManagerSubscribed) {
    isManagerSubscribed = true;

    socket.on('reconnect_with_backoff', (data: { reconnectAfterMs?: number; reason?: string }) => {
      const delay = data?.reconnectAfterMs ?? Math.floor(Math.random() * 5000) + 1000;
      socket?.disconnect();
      setTimeout(() => {
        socket?.connect();
      }, delay);
    });

    socket.on('reconnectWithBackoff', (data: { reconnectAfterMs?: number; reason?: string }) => {
      const delay = data?.reconnectAfterMs ?? Math.floor(Math.random() * 5000) + 1000;
      socket?.disconnect();
      setTimeout(() => {
        socket?.connect();
      }, delay);
    });

    connectionManager.addStateListener((state) => {
      if (state === 'HIBERNATING' && socket?.connected) {
        socket.emit('clientHibernate', { reason: 'tab_hidden' });
      }
    });

    connectionManager.addWakeListener(() => {
      if (socket) {
        if (!socket.connected) {
          socket.connect();
        } else {
          socket.emit('clientWake');
        }
      }
    });
  }

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  isManagerSubscribed = false;
}
