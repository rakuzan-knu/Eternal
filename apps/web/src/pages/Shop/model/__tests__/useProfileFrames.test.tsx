import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { queryKeys } from '@/shared/api/queryKeys';
import { apiClient } from '@/shared/api/httpClient';
import { useProfileFrames } from '../useProfileFrames';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(async (url: string) => ({
      data: url === '/profile-frames' ? [] : { activeProfileFrameId: null, items: [] },
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
  const hook = renderHook(useProfileFrames, { wrapper: Wrapper });
  await waitFor(() => expect(hook.result.current.inventory.isSuccess).toBe(true));
  act(() => hook.result.current.equip.mutate('astral-sigil'));
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalled());
  act(() => useAuthStore.setState({ userId: 'bob' }));
  await waitFor(() => expect(hook.result.current.inventory.isSuccess).toBe(true));
  act(() => finish({ data: { activeProfileFrameId: 'astral-sigil', items: [] } }));
  await waitFor(() => expect(hook.result.current.equip.isSuccess).toBe(true));
  expect(client.getQueryData(queryKeys.profileFrames.inventory('alice'))).toMatchObject({
    activeProfileFrameId: 'astral-sigil',
  });
  expect(client.getQueryData(queryKeys.profileFrames.inventory('bob'))).toMatchObject({
    activeProfileFrameId: null,
  });
  hook.unmount();
  client.clear();
});
