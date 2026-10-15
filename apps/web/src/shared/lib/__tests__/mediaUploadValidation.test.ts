import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaUploadError, validateMediaUpload } from '../mediaUploadValidation';

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);

describe('media selection validation', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:validation');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(['avatar', 'banner', 'post', 'story'] as const)(
    'rejects EXE bytes even with image name and MIME for %s',
    async (purpose) => {
      await expect(
        validateMediaUpload(
          new File(['MZ arbitrary bytes'], 'renamed.png', { type: 'image/png' }),
          purpose,
        ),
      ).rejects.toBeInstanceOf(MediaUploadError);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    },
  );

  it('rejects empty files, unsupported extensions, SVG and mismatched MIME before creating previews', async () => {
    for (const file of [
      new File([], 'empty.png', { type: 'image/png' }),
      new File([png], 'image.exe', { type: 'image/png' }),
      new File(['<svg/>'], 'script.svg', { type: 'image/svg+xml' }),
      new File([png], 'image.png', { type: 'image/jpeg' }),
    ])
      await expect(validateMediaUpload(file, 'banner')).rejects.toBeInstanceOf(MediaUploadError);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('checks the actual image decoder and revokes temporary URLs on failure', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLImageElement,
    ) {
      queueMicrotask(() => this.dispatchEvent(new Event('error')));
    });
    await expect(
      validateMediaUpload(new File([png], 'truncated.png', { type: 'image/png' }), 'avatar'),
    ).rejects.toThrow(/damaged/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:validation');
  });

  it('accepts a decodable image, including an unspecified MIME, and frees its validation URL', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLImageElement,
    ) {
      Object.defineProperties(this, {
        naturalWidth: { value: 640 },
        naturalHeight: { value: 480 },
      });
      queueMicrotask(() => this.dispatchEvent(new Event('load')));
    });
    expect(await validateMediaUpload(new File([png], 'photo.png'), 'post')).toBe('image');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:validation');
  });
  it('classifies audio-only WebM by decoded tracks, accepts recordings without duration metadata, and keeps audio out of posts', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      Object.defineProperties(this, {
        videoWidth: { value: 0 },
        videoHeight: { value: 0 },
        duration: { value: Infinity },
      });
      queueMicrotask(() => this.dispatchEvent(new Event('loadeddata')));
    });
    const file = new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0])], 'voice.webm', {
      type: 'video/webm',
    });
    expect(await validateMediaUpload(file, 'story')).toBe('audio');
    await expect(validateMediaUpload(file, 'post')).rejects.toBeInstanceOf(MediaUploadError);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:validation');
  });
  it('accepts decodable video without an OS-provided MIME and rejects excessive dimensions', async () => {
    let width = 640;
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      Object.defineProperties(this, {
        videoWidth: { value: width },
        videoHeight: { value: 480 },
        duration: { value: 1 },
      });
      queueMicrotask(() => this.dispatchEvent(new Event('loadeddata')));
    });
    const file = new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0])], 'video.webm');
    expect(await validateMediaUpload(file, 'post')).toBe('video');
    width = 16385;
    await expect(validateMediaUpload(file, 'post')).rejects.toThrow(/damaged/);
  });
});
