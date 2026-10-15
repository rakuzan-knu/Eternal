import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  states: new Set<(state: string) => void>(),
  wakes: new Set<() => void>(),
  sockets: [] as Array<{
    handlers: Map<string, (...args: any[]) => void>;
    connected: boolean;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    removeAllListeners: ReturnType<typeof vi.fn>;
  }>,
  token: vi.fn(),
}));
vi.mock('../httpClient', () => ({ getValidAccessToken: mocks.token, isTokenExpired: () => false }));
vi.mock('../connectionManager', () => ({
  connectionManager: {
    addStateListener: (fn: (state: string) => void) => {
      mocks.states.add(fn);
      return () => mocks.states.delete(fn);
    },
    addWakeListener: (fn: () => void) => {
      mocks.wakes.add(fn);
      return () => mocks.wakes.delete(fn);
    },
  },
}));
vi.mock('socket.io-client', () => ({
  io: () => {
    const handlers = new Map();
    const socket = {
      handlers,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((name, fn) => handlers.set(name, fn)),
      removeAllListeners: vi.fn(() => handlers.clear()),
    };
    mocks.sockets.push(socket);
    return socket;
  },
}));
import { disconnectSocket, getSocket } from '../socket';

describe('socket resource lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.sockets.length = 0;
  });
  afterEach(() => {
    disconnectSocket();
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  it('releases manager and socket listeners across 50 session cycles', () => {
    for (let i = 0; i < 50; i++) {
      getSocket();
      disconnectSocket();
    }
    expect(mocks.states.size).toBe(0);
    expect(mocks.wakes.size).toBe(0);
    expect(mocks.sockets.every((socket) => socket.handlers.size === 0)).toBe(true);
  });
  it('coalesces backoff aliases and cancels delayed reconnect on logout', () => {
    getSocket();
    const old = mocks.sockets[0];
    old.handlers.get('reconnect_with_backoff')!({ reconnectAfterMs: 1000 });
    old.handlers.get('reconnectWithBackoff')!({ reconnectAfterMs: 2000 });
    expect(vi.getTimerCount()).toBe(1);
    disconnectSocket();
    getSocket();
    vi.advanceTimersByTime(3000);
    expect(mocks.sockets[1].connect).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not reconnect a new session after an old token refresh resolves', async () => {
    let resolve!: (token: string) => void;
    mocks.token.mockReturnValueOnce(
      new Promise<string>((done) => {
        resolve = done;
      }),
    );
    getSocket();
    mocks.sockets[0].handlers.get('connect_error')!({ message: 'token expired' });
    disconnectSocket();
    getSocket();
    resolve('old-session-token');
    await Promise.resolve();
    expect(mocks.sockets[1].connect).not.toHaveBeenCalled();
  });
});
