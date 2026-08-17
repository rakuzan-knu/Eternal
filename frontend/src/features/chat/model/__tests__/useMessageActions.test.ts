import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMessageActions } from '../useMessageActions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useMessageActions', () => {
  it('returns action functions (sendMessage, editMessage, deleteMessage, uploadAttachment, etc.)', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMessageActions('conv-1'), { wrapper });

    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.editMessage).toBe('function');
    expect(typeof result.current.deleteMessage).toBe('function');
    expect(typeof result.current.uploadAttachment).toBe('function');
    expect(typeof result.current.setTyping).toBe('function');
  });
});
