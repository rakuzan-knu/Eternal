import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage, compressMediaFiles } from '../compressImage';

describe('compressImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('skips non-image files and returns original file', async () => {
    const textFile = new File(['hello'], 'doc.pdf', { type: 'application/pdf' });
    const result = await compressImage(textFile);
    expect(result).toBe(textFile);
  });

  it('skips animated GIF files to avoid losing animation', async () => {
    const gifFile = new File(['gif-bytes'], 'animation.gif', { type: 'image/gif' });
    const result = await compressImage(gifFile);
    expect(result).toBe(gifFile);
  });

  it('skips small images under 250KB', async () => {
    const smallFile = new File(['small'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(smallFile, 'size', { value: 100 * 1024 });
    const result = await compressImage(smallFile);
    expect(result).toBe(smallFile);
  });

  it('handles image error and returns original file', async () => {
    const largeFile = new File(['corrupt data'], 'corrupt.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 500 * 1024 });

    // In jsdom, setting an invalid src on Image doesn't auto trigger onload/onerror unless mocked
    // Let's mock Image
    const originalImage = global.Image;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 3000;
      height = 2000;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 10);
      }
      get src() {
        return this._src;
      }
    } as unknown as typeof Image;

    const result = await compressImage(largeFile);
    expect(result).toBe(largeFile);

    global.Image = originalImage;
  });

  it('scales and compresses when canvas and toBlob succeed', async () => {
    const largeFile = new File(['valid png'], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 500 * 1024 });

    const mockBlob = new Blob(['compressed'], { type: 'image/webp' });
    Object.defineProperty(mockBlob, 'size', { value: 100 * 1024 });

    const originalImage = global.Image;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 3000;
      height = 2000;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
      get src() {
        return this._src;
      }
    } as unknown as typeof Image;

    const origGetContext = HTMLCanvasElement.prototype.getContext;
    const origToBlob = HTMLCanvasElement.prototype.toBlob;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
      callback(mockBlob);
    });

    const compressed = await compressImage(largeFile, 1000, 1000);
    expect(compressed.name).toBe('large.webp');
    expect(compressed.type).toBe('image/webp');

    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toBlob = origToBlob;
    global.Image = originalImage;
  });

  it('compressMediaFiles compresses array of files', async () => {
    const file1 = new File(['a'], 'a.pdf', { type: 'application/pdf' });
    const file2 = new File(['b'], 'b.gif', { type: 'image/gif' });
    const results = await compressMediaFiles([file1, file2]);
    expect(results).toEqual([file1, file2]);
  });
});
