import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useMessageActions } from '../useMessageActions';
import { chatApi } from '../../api/chatApi';

const socket = vi.hoisted(() => ({ emit: vi.fn(), connected: true, on: vi.fn(), off: vi.fn() }));
vi.mock('../useChatSocket', () => ({ useChatSocket: () => socket }));
vi.mock('../../api/chatApi', () => ({
  chatApi: { markRead: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../lib/e2ee/messageE2ee', async (original) => ({
  ...(await original<typeof import('../../lib/e2ee/messageE2ee')>()),
  ensureMessageIdentityRegistered: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal('desktop', {});
  useAuthStore.setState({ userId: 'alice', isAuthenticated: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMessageActions('conversation'), { wrapper });
}

describe('desktop read receipts', () => {
  it('does not read hidden messages and marks the conversation read when restored', async () => {
    let hidden = true;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const { result, unmount } = setup();
    await act(async () => {
      result.current.markRead('message');
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(chatApi.markRead).not.toHaveBeenCalled();
    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(chatApi.markRead).toHaveBeenCalledExactlyOnceWith('conversation');
    expect(socket.emit).toHaveBeenCalledWith('markRead', {
      conversationId: 'conversation',
      messageId: undefined,
    });
    unmount();
  });

  it.each(['hide', 'logout', 'unmount'] as const)(
    'cancels a delayed receipt after %s',
    async (change) => {
      let hidden = false;
      vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
      const { result, unmount } = setup();
      act(() => result.current.markRead('message'));
      if (change === 'hide') hidden = true;
      else if (change === 'logout')
        act(() => useAuthStore.setState({ userId: null, isAuthenticated: false }));
      else unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(chatApi.markRead).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalledWith('markRead', expect.anything());
      if (change !== 'unmount') unmount();
    },
  );
});
