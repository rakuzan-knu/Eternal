import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../useAuthStore';

vi.mock('@/shared/lib/broadcastSync', () => ({
  notifyAuthChange: vi.fn(),
  listenAuthChange: vi.fn(() => vi.fn()),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ userId: null, isAuthenticated: false });
  });

  it('sets authentication state correctly on setAuth', () => {
    useAuthStore.getState().setAuth('user-123');
    expect(useAuthStore.getState().userId).toBe('user-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('clears tokens and resets auth state on clearAuth', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    useAuthStore.getState().setAuth('user-123');

    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().userId).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
