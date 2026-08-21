import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMessageReactionMutation } from '../useMessageReactionMutation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockEmit = vi.fn((_event, _payload, cb) => {
  if (typeof cb === 'function') {
    cb({ status: 'ok', data: {} });
  }
});

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => ({
    emit: mockEmit,
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessageReactionMutation', () => {
  it('toggles reaction by emitting socket event', async () => {
    const { result } = renderHook(() => useMessageReactionMutation('c1'), {
      wrapper: createWrapper(),
    });

    await result.current.toggleReaction('m1', '❤️', false);
    expect(mockEmit).toHaveBeenCalledWith(
      'addReaction',
      { messageId: 'm1', emoji: '❤️' },
      expect.any(Function),
    );

    await result.current.toggleReaction('m1', '❤️', true);
    expect(mockEmit).toHaveBeenCalledWith(
      'removeReaction',
      { messageId: 'm1', emoji: '❤️' },
      expect.any(Function),
    );
  });
});
