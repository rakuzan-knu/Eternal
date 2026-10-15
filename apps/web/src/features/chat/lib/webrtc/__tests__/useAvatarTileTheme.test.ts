import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractAvatarTileTheme, useAvatarTileTheme } from '../useAvatarTileTheme';
import { renderHook, waitFor } from '@testing-library/react';

describe('useAvatarTileTheme', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default dark theme when avatarUrl is null or undefined', async () => {
    const themeNull = await extractAvatarTileTheme(null);
    expect(themeNull).toEqual({
      backgroundColor: '#18181b',
      isLight: false,
    });

    const themeUndefined = await extractAvatarTileTheme(undefined);
    expect(themeUndefined).toEqual({
      backgroundColor: '#18181b',
      isLight: false,
    });
  });

  it('renders default theme in hook when avatar is not provided', () => {
    const { result } = renderHook(() => useAvatarTileTheme(null));
    expect(result.current.backgroundColor).toBe('#18181b');
    expect(result.current.isLight).toBe(false);
  });

  it('correctly calculates dominant color and contrast lightness from image', async () => {
    // Mock Image and canvas 2d context
    const originalImage = window.Image;
    const originalCreateElement = document.createElement.bind(document);

    class MockImage {
      crossOrigin = '';
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    }
    // @ts-expect-error Mocking window.Image
    window.Image = MockImage;

    const mockGetContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        // 16x16 pixels with RGBA: Soft lavender/gray (180, 185, 205, 255)
        data: new Uint8ClampedArray(16 * 16 * 4).map((_, idx) => {
          const mod = idx % 4;
          if (mod === 0) return 180; // R
          if (mod === 1) return 185; // G
          if (mod === 2) return 205; // B
          return 255; // A
        }),
      }),
    });

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas');
        canvas.getContext = mockGetContext as any;
        return canvas;
      }
      return originalCreateElement(tagName);
    });

    try {
      const theme = await extractAvatarTileTheme('https://example.com/avatar.jpg');
      expect(theme.isLight).toBe(true);
      expect(theme.backgroundColor).toContain('hsl(');
    } finally {
      window.Image = originalImage;
      vi.restoreAllMocks();
    }
  });
});
