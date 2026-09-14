import { io, Socket } from 'socket.io-client';
import { getValidAccessToken, isTokenExpired } from './httpClient';

let socket: Socket | null = null;

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(`${getSocketBaseUrl()}/messenger`, {
    autoConnect: true,
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
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

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
