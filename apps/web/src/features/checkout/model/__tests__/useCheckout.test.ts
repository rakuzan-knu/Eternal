import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCheckout } from '../useCheckout';
import { checkoutApi } from '../../api/checkoutApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/checkoutApi', () => ({
  checkoutApi: {
    checkout: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCheckout', () => {
  it('triggers checkout mutation via checkoutApi', async () => {
    vi.mocked(checkoutApi.checkout).mockResolvedValue({ orderId: 'ord-123' });

    const { result } = renderHook(() => useCheckout(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('cart-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ orderId: 'ord-123' });
    expect(checkoutApi.checkout).toHaveBeenCalledWith('cart-123');
  });
});
