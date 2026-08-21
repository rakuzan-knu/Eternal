import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../authApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls login endpoint and returns data', async () => {
    const mockRes = { data: { user: { id: 'u1' }, accessToken: 'a', refreshToken: 'r' } };
    vi.mocked(apiClient.post).mockResolvedValue(mockRes);

    const payload = { identity: 'john@example.com', password: 'password123' };
    const res = await authApi.login(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', payload);
    expect(res).toEqual(mockRes.data);
  });

  it('calls register endpoint and returns data', async () => {
    const mockRes = { data: { user: { id: 'u2' }, accessToken: 'a2', refreshToken: 'r2' } };
    vi.mocked(apiClient.post).mockResolvedValue(mockRes);

    const payload = { email: 'jane@example.com', username: 'jane', password: 'password123' };
    const res = await authApi.register(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/register', payload);
    expect(res).toEqual(mockRes.data);
  });

  it('calls logout with token from argument or localStorage', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

    await authApi.logout('param-token');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'param-token' });

    localStorage.setItem('refreshToken', 'local-token');
    await authApi.logout();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'local-token' });
  });

  it('calls findAccount and resetPassword', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { found: true } });
    const findRes = await authApi.findAccount('user@example.com');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/find-account', {
      identifier: 'user@example.com',
    });
    expect(findRes).toEqual({ found: true });

    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    const resetRes = await authApi.resetPassword({
      identity: 'user@example.com',
      code: '123456',
      newPassword: 'new',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
      identity: 'user@example.com',
      code: '123456',
      newPassword: 'new',
    });
    expect(resetRes).toEqual({ success: true });
  });
});
