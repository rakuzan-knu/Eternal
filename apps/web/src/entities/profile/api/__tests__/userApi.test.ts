import { describe, it, expect, vi } from 'vitest';
import { userApi } from '../userApi';
import { apiClient } from '@/shared/api/httpClient';

describe('userApi', () => {
  it('calls getProfile, getByUsername, getMe', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { id: 'usr-1' } });

    await userApi.getProfile('usr-1');
    expect(getSpy).toHaveBeenCalledWith('/users/usr-1');

    await userApi.getByUsername('alex');
    expect(getSpy).toHaveBeenCalledWith('/users/by-username/alex');

    await userApi.getMe();
    expect(getSpy).toHaveBeenCalledWith('/users/me');
  });

  it('calls checkUsername with cleaned username query param', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { isAvailable: true } });

    const res = await userApi.checkUsername('@alex');
    expect(getSpy).toHaveBeenCalledWith('/auth/check-username', { params: { username: 'alex' } });
    expect(res).toEqual({ isAvailable: true });
  });

  it('calls updatePrimaryBadge, syncGithub, unlinkGithub', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { id: 'usr-1' } });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { mergedPrsCount: 5 } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    await userApi.updatePrimaryBadge('DEVELOPER');
    expect(patchSpy).toHaveBeenCalledWith('/users/primary-badge', { badgeId: 'DEVELOPER' });

    await userApi.syncGithub();
    expect(postSpy).toHaveBeenCalledWith('/users/sync-github');

    await userApi.unlinkGithub();
    expect(deleteSpy).toHaveBeenCalledWith('/auth/github');
  });
});
