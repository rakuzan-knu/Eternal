import { beforeEach, expect, it, vi } from 'vitest';
const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ getMobileApi: () => http }));
import { notificationsApi } from './notificationsApi';
beforeEach(() => {
  http.get.mockResolvedValue({ data: {} });
  http.patch.mockResolvedValue({ data: {} });
  http.delete.mockResolvedValue({ data: {} });
});
it('uses the notification cursor and filter contract with cancellation', async () => {
  const signal = new AbortController().signal;
  await notificationsApi.list('mentions', 'next', signal);
  expect(http.get).toHaveBeenCalledWith('/notifications', {
    params: { type: 'mentions', cursor: 'next', limit: 20 },
    signal,
  });
  await notificationsApi.unread(signal);
  expect(http.get).toHaveBeenLastCalledWith('/notifications/unread-count', { signal });
});
it('marks one item read using PATCH with a safely encoded ID', async () => {
  await notificationsApi.read('item/1');
  expect(http.patch).toHaveBeenCalledWith('/notifications/item%2F1/read');
});
it('preserves the selected category when marking all read', async () => {
  await notificationsApi.readAll('likes');
  expect(http.patch).toHaveBeenCalledWith('/notifications/read-all', undefined, {
    params: { type: 'likes' },
  });
});
it('does not turn a failed list or delete into a successful empty result', async () => {
  http.get.mockRejectedValueOnce(new Error('Network error'));
  await expect(
    notificationsApi.list('all', undefined, new AbortController().signal),
  ).rejects.toThrow('Network error');
  http.delete.mockRejectedValueOnce(new Error('Not found'));
  await expect(notificationsApi.delete('item/1')).rejects.toThrow('Not found');
  expect(http.delete).toHaveBeenCalledWith('/notifications/item%2F1');
});
