import { io, Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { connectionManager } from './connectionManager';
import { getValidAccessToken, isTokenExpired } from './httpClient';

let socket: Socket | null = null;
const managerUnsubscribers: Array<() => void> = [];
let backoffTimer: ReturnType<typeof setTimeout> | null = null;

function getSocketBaseUrl() {
  const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_MESSENGER_API_URL;
  if (wsUrl) {
    return wsUrl.replace(/\/+$/, '').replace(/\/(messenger|v1)$/, '');
  }
  const apiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
    return apiUrl
      .replace(/\/v1\/?$/, '')
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://social-network-backend-4h47.onrender.com';
  }
  return 'http://localhost:3000';
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(`${getSocketBaseUrl()}/messenger`, {
    parser: msgpackParser,
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    auth: (cb) => {
      const token = localStorage.getItem('accessToken');
      if (!token || isTokenExpired(token)) {
        void getValidAccessToken()
          .then((freshToken) => {
            cb({ token: freshToken || token || undefined });
          })
          .catch(() => {
            cb({ token: token || undefined });
          });
      } else {
        cb({ token });
      }
    },
  });

  const currentSocket = socket;
  currentSocket.on('connect_error', (err) => {
    if (
      err?.message?.includes('token') ||
      err?.message?.includes('jwt') ||
      err?.message?.includes('auth') ||
      err?.message?.includes('unauthorized')
    ) {
      void getValidAccessToken()
        .then((newToken) => {
          if (newToken && socket === currentSocket) {
            currentSocket.connect();
          }
        })
        .catch(() => {});
    }
  });

  {
    const reconnectWithBackoff = (data: { reconnectAfterMs?: number; reason?: string }) => {
      const delay = data?.reconnectAfterMs ?? Math.floor(Math.random() * 5000) + 1000;
      if (backoffTimer !== null) clearTimeout(backoffTimer);
      currentSocket.disconnect();
      backoffTimer = setTimeout(() => {
        backoffTimer = null;
        if (socket === currentSocket) currentSocket.connect();
      }, delay);
    };
    currentSocket.on('reconnect_with_backoff', reconnectWithBackoff);
    currentSocket.on('reconnectWithBackoff', reconnectWithBackoff);

    managerUnsubscribers.push(
      connectionManager.addStateListener((state) => {
        if (state === 'HIBERNATING' && currentSocket.connected) {
          currentSocket.emit('clientHibernate', { reason: 'tab_hidden' });
        }
      }),
    );

    managerUnsubscribers.push(
      connectionManager.addWakeListener(() => {
        if (socket === currentSocket && backoffTimer === null) {
          if (!currentSocket.connected) {
            currentSocket.connect();
          } else {
            currentSocket.emit('clientWake');
          }
        }
      }),
    );
  }

  return socket;
}

export function disconnectSocket() {
  const previous = socket;
  socket = null;
  if (backoffTimer !== null) clearTimeout(backoffTimer);
  backoffTimer = null;
  managerUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  previous?.disconnect();
  previous?.removeAllListeners();
}

if (import.meta.hot) import.meta.hot.dispose(disconnectSocket);
