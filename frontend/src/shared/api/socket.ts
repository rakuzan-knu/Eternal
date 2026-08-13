import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(`${getSocketBaseUrl()}/messenger`, {
    autoConnect: false,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
