import { describe, it, expect, vi } from 'vitest';
import { securityApi } from '../securityApi';
import { apiClient } from '@/shared/api/httpClient';

describe('securityApi', () => {
  it('calls changePassword and deleteAccount', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    await securityApi.changePassword({ currentPassword: 'old', newPassword: 'new' });
    expect(postSpy).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old',
      newPassword: 'new',
    });

    await securityApi.deleteAccount('usr-1', 'password123');
    expect(deleteSpy).toHaveBeenCalledWith('/users/usr-1', { data: { password: 'password123' } });
  });
});
