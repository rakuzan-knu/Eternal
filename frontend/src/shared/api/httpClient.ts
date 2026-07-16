import axios from 'axios';
import {
  useAccountsStore,
  type AccountsState,
  type SavedAccount,
} from '@/shared/model/useAccountsStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
        const activeId = useAccountsStore.getState().activeAccountId;
        if (activeId) {
          useAccountsStore.setState((state: AccountsState) => ({
            accounts: state.accounts.map((a: SavedAccount) =>
              a.id === activeId
                ? { ...a, accessToken, refreshToken: newRefreshToken ?? a.refreshToken }
                : a,
            ),
          }));
        }
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
