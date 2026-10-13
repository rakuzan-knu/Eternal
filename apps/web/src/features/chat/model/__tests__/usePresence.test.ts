import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePresenceSync, useQueryOnlineStatus } from '../usePresence';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { getSocket } from '@/shared/api/socket';

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmit = vi.fn((event, payload, cb) => {
  if (cb) cb(null, { status: 'ok', online: ['u1'] });
});

vi.mock('@/shared/api/socket', () => ({
  getSocket: () => ({
    connected: true,
    connect: vi.fn(),
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    timeout: () => ({ emit: mockEmit }),
  }),
}));

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => getSocket(),
}));

describe('usePresence hooks', () => {
  beforeEach(() => {
    usePresenceStore.setState({ onlineUserIds: new Set() });
    vi.clearAllMocks();
  });

  it('subscribes to userOnline and userOffline events', () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { unmount } = renderHook(() => usePresenceSync(), { wrapper });
    expect(mockOn).toHaveBeenCalledWith('userOnline', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('userOffline', expect.any(Function));

    unmount();
    expect(mockOff).toHaveBeenCalledWith('userOnline', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('userOffline', expect.any(Function));
  });

  it('queries online status for users via socket emit', () => {
    renderHook(() => useQueryOnlineStatus(['u1', 'u2']));
    expect(mockEmit).toHaveBeenCalledWith(
      'getOnlineStatus',
      { userIds: ['u1', 'u2'] },
      expect.any(Function),
    );
    expect(usePresenceStore.getState().onlineUserIds.has('u1')).toBe(true);
  });
});
