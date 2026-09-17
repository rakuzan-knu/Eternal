import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSocket, disconnectSocket } from '../socket';
import { io } from 'socket.io-client';

describe('socket', () => {
  beforeEach(() => {
    disconnectSocket();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates and returns a singleton socket instance with auth callback', () => {
    localStorage.setItem('accessToken', 'mock-token-123');
    const socket1 = getSocket();
    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/messenger'),
      expect.objectContaining({
        autoConnect: true,
        transports: ['websocket'],
        withCredentials: true,
      }),
    );

    // Call auth callback
    const ioCall = vi.mocked(io).mock.calls[0];
    const authCallback = (
      ioCall[1] as { auth: (cb: (data: { token: string | null }) => void) => void }
    ).auth;
    const authResultCallback = vi.fn();
    authCallback(authResultCallback);
    expect(authResultCallback).toHaveBeenCalledWith({ token: 'mock-token-123' });

    // Calling again returns same instance
    const socket2 = getSocket();
    expect(socket2).toBe(socket1);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('disconnects socket and clears singleton on disconnectSocket', () => {
    const socket = getSocket();
    disconnectSocket();
    expect(socket.disconnect).toHaveBeenCalled();

    // Next getSocket creates a new socket
    getSocket();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it('disconnectSocket handles when socket is already null', () => {
    disconnectSocket();
    expect(() => disconnectSocket()).not.toThrow();
  });

  it('uses default url http://localhost:3000 when VITE_API_URL is unset', () => {
    vi.stubEnv('VITE_API_URL', '');
    disconnectSocket();
    getSocket();
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3000/messenger'),
      expect.any(Object),
    );
    vi.unstubAllEnvs();
  });

  it('covers the || fallback in getSocketBaseUrl when VITE_API_URL is undefined (line 6)', () => {
    // Explicitly stub to undefined to ensure the right side of || is evaluated
    vi.stubEnv('VITE_API_URL', undefined as any);
    disconnectSocket();
    getSocket();
    expect(io).toHaveBeenCalledWith(expect.stringContaining('/messenger'), expect.any(Object));
    vi.unstubAllEnvs();
  });

  it('strips trailing /api/ from base url', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/');
    disconnectSocket();
    getSocket();
    expect(io).toHaveBeenCalledWith('https://api.example.com/messenger', expect.any(Object));
    vi.unstubAllEnvs();
  });
});
