import { describe, expect, it } from 'vitest';
import { isVideoAttachment } from '../chatMediaUtils';

describe('video attachment classification', () => {
  it('keeps TypeScript source files out of video playback and media galleries', () => {
    expect(
      isVideoAttachment({
        type: 'FILE',
        fileName: 'script.ts',
        mimeType: 'text/typescript',
        url: '/script.ts',
      }),
    ).toBe(false);
    expect(
      isVideoAttachment({
        type: 'FILE',
        fileName: 'script.ts',
        mimeType: 'application/octet-stream',
      }),
    ).toBe(false);
  });

  it('recognizes explicitly typed transport streams and unambiguous media extensions', () => {
    expect(isVideoAttachment({ type: 'VIDEO', fileName: 'segment.ts' })).toBe(true);
    expect(
      isVideoAttachment({ type: 'FILE', fileName: 'segment.ts', mimeType: 'video/mp2t' }),
    ).toBe(true);
    expect(isVideoAttachment({ fileName: 'segment.mpegts' })).toBe(true);
    expect(isVideoAttachment({ type: 'FILE', url: '/legacy.mp4?download=1' })).toBe(true);
  });
});
