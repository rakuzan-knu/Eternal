import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { showcaseApi } from '../api/showcaseApi';
import {
  useShowcase,
  useUpdateShowcase,
  useMediaSearch,
  useTrackSearch,
  useShowcasePresenceSync,
} from '../model/useShowcase';
import { apiClient } from '@/shared/api/httpClient';
import * as socketModule from '@/shared/api/socket';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('showcaseApi & useShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showcaseApi', () => {
    it('calls getShowcase', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 'showcase-1' } });
      const result = await showcaseApi.getShowcase('alice');
      expect(apiClient.get).toHaveBeenCalledWith('/users/alice/showcase');
      expect(result).toEqual({ id: 'showcase-1' });
    });

    it('calls updateShowcase', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { accentColor: '#ff0000' } });
      const result = await showcaseApi.updateShowcase({ accentColor: '#ff0000' });
      expect(apiClient.patch).toHaveBeenCalledWith('/users/me/showcase', {
        accentColor: '#ff0000',
      });
      expect(result).toEqual({ accentColor: '#ff0000' });
    });

    it('calls searchMedia and searchTracks', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 'm1', title: 'Movie' }] });
      const media = await showcaseApi.searchMedia('inception', 'MOVIE' as any);
      expect(apiClient.get).toHaveBeenCalledWith('/users/showcase/search-media', {
        params: { q: 'inception', type: 'MOVIE' },
      });
      expect(media).toHaveLength(1);

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 't1', name: 'Song' }] });
      const tracks = await showcaseApi.searchTracks('blinding lights');
      expect(apiClient.get).toHaveBeenCalledWith('/users/showcase/search-tracks', {
        params: { q: 'blinding lights' },
      });
      expect(tracks).toHaveLength(1);
    });
  });

  describe('useShowcase and mutations', () => {
    it('useShowcase fetches showcase data', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { username: 'alice' } });
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useShowcase('alice'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual({ username: 'alice' });
    });

    it('useShowcase handles empty username fallback in queryFn', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { username: '' } });
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useShowcase(''), { wrapper });
      await result.current.refetch();
      expect(apiClient.get).toHaveBeenCalledWith('/users//showcase');
    });

    it('useUpdateShowcase mutates all fields and rolls back on error', async () => {
      const { queryClient, wrapper } = createWrapper();
      const initialData = {
        accentColor: '#000000',
        connectedAccounts: { github: 'octocat' },
        activityStatus: { text: 'Old' },
        spotlightMedia: null,
        anthemTrack: null,
        mediaItems: [],
      };
      queryClient.setQueryData(['showcase', 'alice'], initialData);

      // 1. Success with all fields
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { accentColor: '#123456' } });
      const { result } = renderHook(() => useUpdateShowcase('alice'), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          accentColor: '#123456',
          privacyMeta: 'PUBLIC' as any,
          privacyActivity: 'FOLLOWERS' as any,
          privacyShowcase: 'PUBLIC' as any,
          privacyLinks: 'PRIVATE' as any,
          connectedAccounts: { discord: 'discorduser' } as any,
          activityStatus: { text: 'New status' } as any,
          spotlightMedia: { id: 'media-1' } as any,
          anthemTrack: { id: 'track-1' } as any,
          showAge: true,
          showBirthdate: false,
          showGender: true,
          showTimezone: false,
          pronouns: 'they/them',
          timezone: 'UTC',
          mediaItems: [
            {
              type: 'GAME' as any,
              title: 'Zelda',
              posterUrl: 'https://example.com/zelda.jpg',
            } as any,
          ],
        });
      });

      expect(apiClient.patch).toHaveBeenCalled();

      // 2. Error case with rollback
      vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('Update failed'));
      await act(async () => {
        try {
          await result.current.mutateAsync({
            accentColor: '#ffffff',
            connectedAccounts: null,
          });
        } catch {
          // Expected
        }
      });

      const rolledBack = queryClient.getQueryData<any>(['showcase', 'alice']);
      expect(rolledBack).toBeDefined();
    });

    it('useMediaSearch and useTrackSearch work correctly', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
      const { wrapper } = createWrapper();

      const { result: mediaResult } = renderHook(() => useMediaSearch('matrix', 'MOVIE' as any), {
        wrapper,
      });
      const { result: trackResult } = renderHook(() => useTrackSearch('song'), { wrapper });

      await waitFor(() => {
        expect(mediaResult.current.isSuccess).toBe(true);
        expect(trackResult.current.isSuccess).toBe(true);
      });
    });

    it('useShowcasePresenceSync subscribes and unsubscribes to socket events', () => {
      const mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };
      vi.spyOn(socketModule, 'getSocket').mockReturnValue(mockSocket as any);

      const { wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(['showcase', 'bob'], { id: 's1' });

      const { unmount } = renderHook(() => useShowcasePresenceSync('u-bob', 'bob'), { wrapper });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribeShowcase', { targetUserId: 'u-bob' });
      expect(mockSocket.on).toHaveBeenCalledWith('showcase:presence:update', expect.any(Function));

      // Simulate event
      const handler = mockSocket.on.mock.calls[0][1];
      act(() => {
        handler({ userId: 'u-bob', activityStatus: { text: 'Coding' } });
      });

      const updated = queryClient.getQueryData<any>(['showcase', 'bob']);
      expect(updated?.activityStatus).toEqual({ text: 'Coding' });

      unmount();
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribeShowcase', {
        targetUserId: 'u-bob',
      });
      expect(mockSocket.off).toHaveBeenCalled();
    });

    it('useShowcasePresenceSync handles empty socket or user params gracefully', () => {
      vi.spyOn(socketModule, 'getSocket').mockReturnValue(null as any);
      const { wrapper } = createWrapper();
      renderHook(() => useShowcasePresenceSync(undefined, undefined), { wrapper });
    });

    it('useUpdateShowcase handles unauthenticated user and empty previous cache safely', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateShowcase(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ accentColor: '#333333' });
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/users/me/showcase', {
        accentColor: '#333333',
      });
    });

    it('useShowcasePresenceSync handles empty cache update when presence event arrives', () => {
      const mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      };
      vi.spyOn(socketModule, 'getSocket').mockReturnValue(mockSocket as any);

      const { wrapper, queryClient } = createWrapper();
      // No query data in cache for ['showcase', 'alice']
      renderHook(() => useShowcasePresenceSync('u-alice', 'alice'), { wrapper });

      const handler = mockSocket.on.mock.calls[0][1];
      act(() => {
        handler({ userId: 'u-alice', activityStatus: { text: 'Online' } });
      });

      expect(queryClient.getQueryData(['showcase', 'alice'])).toBeUndefined();
    });
  });
});
