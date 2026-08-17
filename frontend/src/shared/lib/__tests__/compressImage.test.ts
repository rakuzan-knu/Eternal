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

  it('compressMediaFiles compresses array of files', async () => {
    const file1 = new File(['a'], 'a.pdf', { type: 'application/pdf' });
    const file2 = new File(['b'], 'b.gif', { type: 'image/gif' });
    const results = await compressMediaFiles([file1, file2]);
    expect(results).toEqual([file1, file2]);
  });
});
