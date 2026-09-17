import { io, Socket } from 'socket.io-client';

export interface SocketClientConfig {
  baseUrl: string;
  token?: string | null | (() => string | null | Promise<string | null>);
  namespace?: string;
  transports?: ('websocket' | 'polling')[];
}

let socketInstance: Socket | null = null;

export function createSocketClient(config: SocketClientConfig): Socket {
  const ns = config.namespace
    ? config.namespace.startsWith('/')
      ? config.namespace
      : `/${config.namespace}`
    : '';
  const url = `${config.baseUrl}${ns}`;

  const socket = io(url, {
    transports: config.transports || ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: async (cb) => {
      let token: string | null | undefined = null;
      if (typeof config.token === 'function') {
        token = await config.token();
      } else {
        token = config.token;
      }
      cb({ token: token || undefined });
    },
  });

  return socket;
}

export function getSharedSocket(config?: SocketClientConfig): Socket {
  if (socketInstance) return socketInstance;
  if (!config) {
    throw new Error('SocketClientConfig must be provided on first call to getSharedSocket()');
  }
  socketInstance = createSocketClient(config);
  return socketInstance;
}

export function disconnectSharedSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
