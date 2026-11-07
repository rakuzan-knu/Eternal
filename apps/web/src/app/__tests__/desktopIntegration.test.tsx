import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useDesktopIntegration } from '../useDesktopIntegration';
import { DesktopBadge } from '../DesktopBadge';
import { createNavigationQueue } from '../../../../desktop/src/main/deepLinks';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setBadgeCount: vi.fn(),
  resetNativeState: vi.fn(),
  waitForNavigation: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/features/chat', () => ({ useUnreadMessagesCount: () => 3 }));
vi.mock('@/entities/notification', () => ({
  useNotificationStore: (selector: (state: { unreadCounts: { total: number } }) => number) =>
    selector({ unreadCounts: { total: 2 } }),
  useUnreadCountsQuery: vi.fn(),
}));

let deliver: (path: string | null) => void;

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ userId: null, isAuthenticated: false });
  mocks.waitForNavigation.mockImplementation(
    () =>
      new Promise<string | null>((resolve) => {
        deliver = resolve;
      }),
  );
  mocks.setBadgeCount.mockResolvedValue(undefined);
  mocks.resetNativeState.mockResolvedValue(undefined);
  vi.stubGlobal('desktop', mocks);
});
afterEach(() => vi.unstubAllGlobals());

describe('desktop renderer integration', () => {
  it('holds a startup deep link until login and navigates without a page reload', async () => {
    const { unmount } = renderHook(useDesktopIntegration);
    await act(async () => {});
    await act(async () => {
      deliver('/messages/conversation?messageId=one');
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
    act(() => useAuthStore.setState({ userId: 'alice', isAuthenticated: true }));
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/messages/conversation?messageId=one');
    await act(async () => {
      deliver('/notifications');
    });
    expect(mocks.navigate).toHaveBeenLastCalledWith('/notifications');
    unmount();
    await act(async () => {
      deliver('/messages/stale');
    });
    expect(mocks.navigate).toHaveBeenCalledTimes(2);
  });

  it('does not consume the startup link during the discarded StrictMode effect', async () => {
    const queue = createNavigationQueue();
    queue.push('/messages/startup');
    mocks.waitForNavigation.mockImplementation(() => queue.wait());
    useAuthStore.setState({ userId: 'alice', isAuthenticated: true });
    const { unmount } = renderHook(useDesktopIntegration, { wrapper: React.StrictMode });
    await act(async () => {});
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/messages/startup');
    unmount();
    queue.reset();
  });

  it('preserves the badge after mount/login/account switch and clears it on logout', () => {
    let badge = 0;
    mocks.setBadgeCount.mockImplementation(async (count: number) => {
      badge = count;
    });
    mocks.resetNativeState.mockImplementation(async () => {
      badge = 0;
    });
    useAuthStore.setState({ userId: 'alice', isAuthenticated: true });
    function Parent() {
      useDesktopIntegration();
      const authenticated = useAuthStore((state) => state.isAuthenticated);
      return authenticated ? <DesktopBadge /> : null;
    }
    const { unmount } = render(
      <React.StrictMode>
        <Parent />
      </React.StrictMode>,
    );
    expect(badge).toBe(5);
    act(() => useAuthStore.setState({ userId: 'bob', isAuthenticated: true }));
    expect(badge).toBe(5);
    act(() => useAuthStore.setState({ userId: null, isAuthenticated: false }));
    expect(badge).toBe(0);
    act(() => useAuthStore.setState({ userId: 'alice', isAuthenticated: true }));
    expect(badge).toBe(5);
    unmount();
    expect(badge).toBe(0);
  });

  it('does not start desktop listeners in a browser', () => {
    vi.stubGlobal('desktop', undefined);
    renderHook(useDesktopIntegration);
    expect(mocks.waitForNavigation).not.toHaveBeenCalled();
    expect(mocks.resetNativeState).not.toHaveBeenCalled();
  });
});
