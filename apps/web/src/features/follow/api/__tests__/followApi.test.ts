import { describe, it, expect, vi } from 'vitest';
import { followApi, normalizeFollowListPage } from '../followApi';
import { apiClient } from '@/shared/api/httpClient';

describe('followApi', () => {
  it('preserves valid nameplates on followers and friends and ignores malformed media metadata', async () => {
    const activeNameplate = {
      id: 'sky',
      slug: 'sky',
      name: 'Sky',
      description: '',
      assetType: 'video',
      assetUrl: '/sky.mp4',
      previewUrl: '/sky.webp',
      width: 640,
      height: 112,
      fps: 10,
      durationMs: 1500,
      shadeOpacity: 0.58,
      rarity: 'epic',
      priceCents: 199,
      isAvailable: false,
    };
    expect(
      normalizeFollowListPage({ items: [{ id: 'alice', username: 'alice', activeNameplate }] })
        .items[0]?.activeNameplate,
    ).toEqual(activeNameplate);
    expect(
      normalizeFollowListPage({
        items: [{ id: 'bob', username: 'bob', activeNameplate: { id: 'broken' } }],
      }).items[0]?.activeNameplate,
    ).toBeNull();
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [{ id: 'alice', username: 'alice', activeNameplate }],
    });
    expect((await followApi.getFriends())[0]?.activeNameplate).toEqual(activeNameplate);
  });
  it('normalizes raw follow list page and handles null input', () => {
    expect(normalizeFollowListPage(null)).toEqual({ items: [], nextCursor: null });

    const raw = {
      items: [{ id: 'usr-1', username: 'alice', displayName: 'Alice', isFollowing: true }],
      meta: { nextCursor: 'cur-123' },
    };

    const normalized = normalizeFollowListPage(raw);
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].username).toBe('alice');
    expect(normalized.nextCursor).toBe('cur-123');
  });

  it('calls all follow API endpoints', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });

    await followApi.follow('usr-2');
    expect(postSpy).toHaveBeenCalledWith('/users/usr-2/follow');

    await followApi.unfollow('usr-2');
    expect(deleteSpy).toHaveBeenCalledWith('/users/usr-2/follow');

    await followApi.getFollowers('usr-2', 'cursor-1');
    expect(getSpy).toHaveBeenCalledWith('/users/usr-2/followers', {
      params: { after: 'cursor-1', limit: 20 },
    });

    await followApi.getFollowing('usr-2');
    expect(getSpy).toHaveBeenCalledWith('/users/usr-2/following', {
      params: { after: undefined, limit: 20 },
    });

    const friends = await followApi.getFriends();
    expect(getSpy).toHaveBeenCalledWith('/users/me/friends');
    expect(friends).toEqual([]);

    await followApi.removeFollower('usr-follower-1');
    expect(deleteSpy).toHaveBeenCalledWith('/users/me/followers/usr-follower-1');

    await followApi.dismissSuggestedUser('usr-target-1');
    expect(postSpy).toHaveBeenCalledWith('/users/suggested/usr-target-1/dismiss');
  });
});
