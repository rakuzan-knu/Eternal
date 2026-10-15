import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { queryKeys } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/httpClient';
import { useDecorations } from '../useDecorations';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(async (url: string) => ({
      data: url === '/decorations' ? [] : { activeDecorationId: null, items: [] },
    })),
    patch: vi.fn(),
  },
}));
afterEach(() => useAuthStore.setState({ userId: null, isAuthenticated: false }));

it('keeps an in-flight equip response in its original account after switching users', async () => {
  useAuthStore.setState({ userId: 'alice', isAuthenticated: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let finish!: (value: unknown) => void;
  vi.mocked(apiClient.patch).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }) as ReturnType<typeof apiClient.patch>,
  );
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const hook = renderHook(useDecorations, { wrapper: Wrapper });
  await waitFor(() => expect(hook.result.current.inventory.isSuccess).toBe(true));
  act(() => hook.result.current.equip.mutate('astral-sigil'));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalled());
  act(() => useAuthStore.setState({ userId: 'bob' }));
  await waitFor(() => expect(hook.result.current.inventory.isSuccess).toBe(true));
  act(() => finish({ data: { activeDecorationId: 'astral-sigil', items: [] } }));
  await waitFor(() => expect(hook.result.current.equip.isSuccess).toBe(true));
  expect(client.getQueryData(queryKeys.decorations.inventory('alice'))).toMatchObject({
    activeDecorationId: 'astral-sigil',
  });
  expect(client.getQueryData(queryKeys.decorations.inventory('bob'))).toMatchObject({
    activeDecorationId: null,
  });
  hook.unmount();
  client.clear();
});
