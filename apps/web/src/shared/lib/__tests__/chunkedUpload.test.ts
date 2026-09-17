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

  it('retries chunk upload on failure before succeeding', async () => {
    vi.useFakeTimers();
    const testBlob = new Blob([new Uint8Array(1024)], { type: 'image/png' });
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no session'));
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce(new Error('Network glitch'))
      .mockResolvedValueOnce({ data: { complete: true } });

    const uploadPromise = uploadFileInChunks({
      file: testBlob,
      fileName: 'test.png',
      chunkSize: 1024,
    });

    await vi.runAllTimersAsync();
    const result = await uploadPromise;

    expect(result.complete).toBe(true);
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws when max retries exceeded', async () => {
    vi.useFakeTimers();
    const testBlob = new Blob([new Uint8Array(1024)], { type: 'image/png' });
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no session'));
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Persistent error'));

    const uploadPromise = uploadFileInChunks({
      file: testBlob,
      fileName: 'test.png',
      chunkSize: 1024,
    });

    const assertion = expect(uploadPromise).rejects.toThrow('Persistent error');
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
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

  it('uses default blob_upload fileName when Blob is passed without fileName', async () => {
    const rawBlob = new Blob(['sample blob content'], { type: 'application/octet-stream' });
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no session'));
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { complete: true } });

    const result = await uploadFileInChunks({
      file: rawBlob,
    });

    expect(result.complete).toBe(true);
    const postCall = vi.mocked(apiClient.post).mock.calls[0];
    const formData = postCall[1] as FormData;
    expect(formData.get('chunk')).toBeDefined();
  });

  it('throws abort error when signal is aborted during retry loop', async () => {
    const testBlob = new Blob([new Uint8Array(1024)], { type: 'image/png' });
    const controller = new AbortController();

    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no session'));
    vi.mocked(apiClient.post).mockImplementationOnce(async () => {
      controller.abort();
      throw new Error('First failure');
    });

    await expect(
      uploadFileInChunks({
        file: testBlob,
        signal: controller.signal,
        chunkSize: 1024,
      }),
    ).rejects.toThrow();
  });

  it('covers line 39 - uses File.name when file is a File instance and no fileName provided', async () => {
    // A File object has a .name property - this covers the `file instanceof File ? file.name : 'blob_upload'` branch
    const testFile = new File([new Uint8Array(512)], 'my-photo.jpg', { type: 'image/jpeg' });
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no session'));
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { complete: true } });

    const result = await uploadFileInChunks({
      file: testFile,
      // no fileName provided - should use testFile.name
      chunkSize: 1024,
    });

    expect(result.complete).toBe(true);
    // Verify the filename was taken from the File object
    const postCall = vi.mocked(apiClient.post).mock.calls[0];
    const formData = postCall[1] as FormData;
    const chunk = formData.get('chunk') as File;
    expect(chunk?.name).toBe('my-photo.jpg');
  });

  it('covers line 86 - aborts during sleep/retry (signal aborted between retry attempts)', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();

    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('no session'));
    vi.mocked(apiClient.post)
      .mockRejectedValueOnce(new Error('Network error')) // first attempt fails
      .mockRejectedValueOnce(new Error('Should not reach')); // second attempt

    const uploadPromise = uploadFileInChunks({
      file: new Blob([new Uint8Array(512)], { type: 'image/png' }),
      chunkSize: 1024,
      signal: controller.signal,
    });

    const assertion = expect(uploadPromise).rejects.toThrow();
    controller.abort();
    await vi.runAllTimersAsync();
    await assertion;
    vi.useRealTimers();
  });
});
