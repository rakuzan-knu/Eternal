import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthMutations } from '../useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    findAccount: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAuthMutations', () => {
  it('exposes login, register, findAccount, and reset mutations', () => {
    const { result } = renderHook(() => useAuthMutations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loginMutation).toBeDefined();
    expect(result.current.registerMutation).toBeDefined();
    expect(result.current.findAccountMutation).toBeDefined();
    expect(result.current.resetMutation).toBeDefined();
  });
});
