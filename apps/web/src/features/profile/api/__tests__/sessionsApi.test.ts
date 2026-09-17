import { describe, it, expect, vi } from 'vitest';
import { sessionsApi } from '../sessionsApi';
import { apiClient } from '@/shared/api/httpClient';

describe('sessionsApi', () => {
  it('calls list, revoke, revokeAllOthers', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 'sess-1' }] });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    const listRes = await sessionsApi.list();
    expect(getSpy).toHaveBeenCalledWith('/auth/sessions');
    expect(listRes).toEqual([{ id: 'sess-1' }]);

    await sessionsApi.revoke('sess-1');
    expect(deleteSpy).toHaveBeenCalledWith('/auth/sessions/sess-1');

    await sessionsApi.revokeAllOthers();
    expect(deleteSpy).toHaveBeenCalledWith('/auth/sessions');
  });
});
