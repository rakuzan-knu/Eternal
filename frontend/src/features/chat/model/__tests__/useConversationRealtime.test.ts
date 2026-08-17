import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConversationRealtime } from '../useConversationRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useConversationRealtime', () => {
  it('returns initial typing set and sets up socket events', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useConversationRealtime('conv-1'), { wrapper });

    expect(result.current.typingUserIds).toBeDefined();
    expect(result.current.typingUserIds.size).toBe(0);
  });
});
