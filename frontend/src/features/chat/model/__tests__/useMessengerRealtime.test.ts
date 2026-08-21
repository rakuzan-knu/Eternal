import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMessengerRealtime } from '../useMessengerRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => ({
    connected: true,
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
  }),
}));

vi.mock('../useChatSocketEvent', () => ({
  useChatSocketEvent: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMessengerRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joins conversations and sends socket events', () => {
    renderHook(() => useMessengerRealtime(['conv-1', 'conv-2']), {
      wrapper: createWrapper(),
    });

    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-1' });
    expect(mockEmit).toHaveBeenCalledWith('joinConversation', { conversationId: 'conv-2' });
  });
});
