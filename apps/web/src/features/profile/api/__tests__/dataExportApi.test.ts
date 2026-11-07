import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { prepareDataExport } from '../dataExportApi';

vi.mock('@/shared/api/httpClient', () => ({ apiClient: { post: vi.fn() } }));

const page = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  service: 'core',
  section: 'posts',
  exportedAt: '2026-11-05T00:00:00.000Z',
  items: [{ id: 'own-item' }],
  nextCursor: null,
  limitations: ['Media files excluded'],
  ...overrides,
});
const options = () => ({
  password: 'secret',
  sections: ['posts'] as const,
  signal: new AbortController().signal,
  onProgress: vi.fn(),
});

describe('data export download', () => {
  beforeEach(() => vi.clearAllMocks());

  it('follows every cursor and routes message requests to their owner', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: page({ nextCursor: 'opaque-cursor' }) })
      .mockResolvedValueOnce({ data: page() })
      .mockResolvedValueOnce({ data: page({ service: 'messenger', section: 'messages' }) });
    const input = { ...options(), sections: ['posts', 'messages'] as const };
    const file = await prepareDataExport(input);
    expect(file.type).toBe('application/json;charset=utf-8');
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/users/me/data-export',
      { password: 'secret', section: 'posts', cursor: 'opaque-cursor', limit: 100 },
      { signal: input.signal },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      '/messenger/me/data-export',
      { password: 'secret', section: 'messages', limit: 100 },
      { signal: input.signal },
    );
    expect(input.onProgress).toHaveBeenLastCalledWith({ section: 'messages', records: 3 });
  });

  it.each([page({ service: 'messenger' }), page({ section: 'comments' }), { schemaVersion: 2 }])(
    'rejects mismatched or invalid response shapes',
    async (data) => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data });
      await expect(prepareDataExport(options())).rejects.toThrow('EXPORT_RESPONSE');
    },
  );

  it('rejects repeated cursors rather than looping or silently truncating', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: page({ nextCursor: 'repeated' }) });
    await expect(prepareDataExport(options())).rejects.toThrow('EXPORT_RESPONSE');
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('does not return a partial file after a later failure', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: page({ nextCursor: 'next' }) })
      .mockRejectedValueOnce(new Error('unavailable'));
    await expect(prepareDataExport(options())).rejects.toThrow('unavailable');
  });

  it('honours cancellation even when the transport delivers a late response', async () => {
    const controller = new AbortController();
    vi.mocked(apiClient.post).mockImplementation(async () => {
      controller.abort();
      return { data: page() };
    });
    await expect(
      prepareDataExport({ ...options(), signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('fails explicitly when the file exceeds the memory budget', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: page({ items: [{ content: 'x'.repeat(26 * 1024 * 1024) }] }),
    });
    await expect(prepareDataExport(options())).rejects.toThrow('EXPORT_LIMIT');
  });
});
