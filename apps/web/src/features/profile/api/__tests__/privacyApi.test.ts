import { describe, it, expect, vi } from 'vitest';
import { privacyApi } from '../privacyApi';
import { apiClient } from '@/shared/api/httpClient';

describe('privacyApi', () => {
  it('calls getPrivacy and updatePrivacy', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { isPrivate: false } });
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { isPrivate: true } });

    await privacyApi.getPrivacy();
    expect(getSpy).toHaveBeenCalledWith('/users/me/privacy');

    await privacyApi.updatePrivacy({ isPrivate: true });
    expect(patchSpy).toHaveBeenCalledWith('/users/me/privacy', { isPrivate: true });
  });

  it('calls listExceptions, addException, removeException', async () => {
    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: { alwaysAllow: [], neverAllow: [] } });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: 'usr-2' } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    await privacyApi.listExceptions('LAST_SEEN');
    expect(getSpy).toHaveBeenCalledWith('/users/me/privacy/exceptions', {
      params: { dimension: 'LAST_SEEN' },
    });

    await privacyApi.addException('LAST_SEEN', 'usr-2', 'ALLOW');
    expect(postSpy).toHaveBeenCalledWith('/users/me/privacy/exceptions', {
      dimension: 'LAST_SEEN',
      targetId: 'usr-2',
      mode: 'ALLOW',
    });

    await privacyApi.removeException('LAST_SEEN', 'usr-2');
    expect(deleteSpy).toHaveBeenCalledWith('/users/me/privacy/exceptions/LAST_SEEN/usr-2');
  });
});
