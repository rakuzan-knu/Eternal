import { describe, expect, it, vi, beforeEach } from 'vitest';
import { uploadFileInChunks } from '../chunkedUpload';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('uploadFileInChunks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('slices file into 5MB chunks and uploads sequentially with progress reporting', async () => {
    // Create a 12 MB test Blob (3 chunks: 5MB + 5MB + 2MB)
    const blobSize = 12 * 1024 * 1024;
    const testBlob = new Blob([new Uint8Array(blobSize)], { type: 'video/mp4' });

    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no previous session'));
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { complete: false, uploadedChunks: [0] } })
      .mockResolvedValueOnce({ data: { complete: false, uploadedChunks: [0, 1] } })
      .mockResolvedValueOnce({
        data: {
          complete: true,
          uploadedChunks: [0, 1, 2],
          media: { type: 'video', url: 'https://cdn.example.com/video.mp4', order: 0 },
        },
      });

    const progressCalls: { uploadedBytes: number; totalBytes: number; percent: number }[] = [];
    const result = await uploadFileInChunks({
      file: testBlob,
      fileName: 'clip.mp4',
      onProgress: (p) => progressCalls.push(p),
    });

    expect(result.complete).toBe(true);
    expect(result.media?.url).toBe('https://cdn.example.com/video.mp4');
    expect(apiClient.post).toHaveBeenCalledTimes(3);
    expect(progressCalls.length).toBe(3);
    expect(progressCalls[progressCalls.length - 1].percent).toBe(100);
  });

  it('skips already uploaded chunks when resuming session', async () => {
    const testBlob = new Blob([new Uint8Array(10 * 1024 * 1024)], { type: 'video/mp4' });

    // Status returns chunk 0 already uploaded
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { uploadedChunks: [0] },
    });

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        complete: true,
        media: { type: 'video', url: 'https://cdn.example.com/video.mp4', order: 0 },
      },
    });

    const result = await uploadFileInChunks({
      file: testBlob,
      fileName: 'clip.mp4',
    });

    expect(result.complete).toBe(true);
    expect(apiClient.post).toHaveBeenCalledTimes(1); // only chunk 1 was uploaded
  });

  it('throws error when signal is aborted', async () => {
    const testBlob = new Blob([new Uint8Array(1024)], { type: 'image/png' });
    const controller = new AbortController();
    controller.abort();

    await expect(
      uploadFileInChunks({
        file: testBlob,
        signal: controller.signal,
      }),
    ).rejects.toThrow('Upload aborted');
  });
});
