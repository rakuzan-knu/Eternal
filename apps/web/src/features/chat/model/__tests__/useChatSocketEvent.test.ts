import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatSocketEvent } from '../useChatSocketEvent';
import { getSocket } from '@/shared/api/socket';

const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock('@/shared/api/socket', () => ({
  getSocket: () => ({
    connected: true,
    connect: vi.fn(),
    on: mockOn,
    off: mockOff,
    emit: vi.fn(),
  }),
}));

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => getSocket(),
}));

describe('useChatSocketEvent', () => {
  it('subscribes to socket event on mount and unsubscribes on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useChatSocketEvent('testEvent', handler));

    expect(mockOn).toHaveBeenCalledWith('testEvent', handler);

    unmount();
    expect(mockOff).toHaveBeenCalledWith('testEvent', handler);
  });
});
