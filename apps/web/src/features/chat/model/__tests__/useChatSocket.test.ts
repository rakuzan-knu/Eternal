import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatSocket } from '../useChatSocket';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { getSocket } from '@/shared/api/socket';

vi.mock('@/shared/api/socket', () => {
  const mSocket = {
    connected: false,
    connect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  return { getSocket: () => mSocket };
});

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects socket when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true, userId: 'u1' });
    const { result } = renderHook(() => useChatSocket());

    const socket = getSocket();
    expect(socket.connect).toHaveBeenCalled();
    expect(result.current).toBe(socket);
  });
});
