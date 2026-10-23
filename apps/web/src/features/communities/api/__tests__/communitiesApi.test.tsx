import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { communitiesApi, useCommunityDirectory, useCommunityChannels } from '../communitiesApi';
import { queryKeys } from '@/shared/api/queryKeys';
import {
  communityChannelsResponseSchema,
  communityChannelLayoutSchema,
} from '@social-network/shared-contracts';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/shared/api/httpClient', () => ({ apiClient: http }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('community response boundaries', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reconciles a fresh persisted channel snapshot on mount after an acknowledged layout edit', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } },
    });
    client.setQueryData(queryKeys.communities.channels('server'), {
      communityId: 'server',
      role: 'OWNER',
      data: [],
      categories: [],
      revision: 0,
    });
    http.get.mockResolvedValue({
      data: { communityId: 'server', role: 'MEMBER', data: [], categories: [], revision: 1 },
    });
    const { result } = renderHook(() => useCommunityChannels('server', true), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.data?.revision).toBe(1));
    expect(result.current.data?.role).toBe('MEMBER');
    expect(http.get).toHaveBeenCalledWith(
      '/messenger/communities/server/channels',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    client.clear();
  });
  it('reads older channel responses without enabling unsupported layout writes', () => {
    expect(
      communityChannelsResponseSchema.parse({ communityId: 'server', role: 'MEMBER', data: [] }),
    ).toEqual({ communityId: 'server', role: 'MEMBER', data: [], categories: [] });
  });
  it('rejects duplicate category IDs and dangling category assignments', () => {
    const id = '10000000-0000-4000-8000-000000000001';
    expect(
      communityChannelLayoutSchema.safeParse({
        revision: 0,
        categories: [
          { id, name: 'A' },
          { id, name: 'B' },
        ],
        channels: [],
      }).success,
    ).toBe(false);
    expect(
      communityChannelLayoutSchema.safeParse({
        revision: 0,
        categories: [],
        channels: [{ id, name: 'Channel', description: '', categoryId: id }],
      }).success,
    ).toBe(false);
  });

  it.each([
    '<!doctype html><html>SPA fallback</html>',
    { message: 'older backend' },
    { data: [{ memberCount: 'invalid' }], nextCursor: null },
  ])('treats an incompatible response as a recoverable query error', async (data) => {
    http.get.mockResolvedValue({ data });
    const { result } = renderHook(() => useCommunityDirectory(''), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
  });

  it('accepts an explicitly empty directory without treating it as a failure', async () => {
    http.get.mockResolvedValue({ data: { data: [], nextCursor: null } });
    const { result } = renderHook(() => useCommunityDirectory(''), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ data: [], nextCursor: null });
  });

  it('rejects incompatible data restored from an older offline snapshot too', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(
      queryKeys.communities.directory(''),
      '<html>previously cached response</html>',
    );
    http.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCommunityDirectory(''), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    client.clear();
  });

  it('does not confirm invitation or community writes from a successful HTML response', async () => {
    http.post.mockResolvedValue({ data: '<html>not an API response</html>' });
    await expect(communitiesApi.create({ name: 'My community' })).rejects.toThrow();
    await expect(communitiesApi.invite('community', { expiresInDays: 7 })).rejects.toThrow();
    await expect(communitiesApi.join('a'.repeat(43))).rejects.toThrow();
  });

  it('rejects partial invitation previews before rendering community metadata', async () => {
    http.get.mockResolvedValue({ data: { community: { name: 'Incomplete' } } });
    await expect(communitiesApi.preview('a'.repeat(43))).rejects.toThrow();
  });
});
