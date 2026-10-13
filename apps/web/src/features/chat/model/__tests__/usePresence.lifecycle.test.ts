import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueryOnlineStatus } from '../usePresence';
import { usePresenceStore } from '@/shared/model/usePresenceStore';

const transport = vi.hoisted(() => ({
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  timeout: vi.fn(),
}));
vi.mock('../useChatSocket', () => ({ useChatSocket: () => transport }));

describe('presence acknowledgement lifetime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    transport.connected = true;
    transport.timeout.mockReturnValue(transport);
    usePresenceStore.setState({ onlineUserIds: new Set(), userActivities: {} });
  });
  afterEach(() => vi.useRealTimers());
  it('bounds an unanswered acknowledgement and prevents overlapping focus refreshes', () => {
    renderHook(() => useQueryOnlineStatus(['u1']));
    act(() => {
      for (let i = 0; i < 100; i++) window.dispatchEvent(new Event('focus'));
    });
    expect(transport.emit).toHaveBeenCalledTimes(1);
    expect(transport.timeout).toHaveBeenCalledWith(8000);
    const acknowledge = transport.emit.mock.calls[0][2];
    act(() => acknowledge(new Error('timeout')));
    act(() => vi.advanceTimersByTime(10000));
    expect(transport.emit).toHaveBeenCalledTimes(2);
  });
  it('does not buffer presence reads while disconnected', () => {
    transport.connected = false;
    renderHook(() => useQueryOnlineStatus(['u1']));
    act(() => vi.advanceTimersByTime(60000));
    expect(transport.emit).not.toHaveBeenCalled();
  });
  it('ignores late acknowledgements after the requesting screen is unmounted', () => {
    const { unmount } = renderHook(() => useQueryOnlineStatus(['u1']));
    const acknowledge = transport.emit.mock.calls[0][2];
    const timed = transport.timeout.mock.calls.length > 0;
    unmount();
    act(() => {
      const reply = { status: 'ok', online: ['u1'] };
      if (timed) acknowledge(null, reply);
      else acknowledge(reply);
    });
    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
  });
});
