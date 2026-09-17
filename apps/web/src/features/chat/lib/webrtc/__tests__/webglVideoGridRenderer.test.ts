import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebGLVideoGridRenderer } from '../webglVideoGridRenderer';

describe('WebGLVideoGridRenderer', () => {
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn().mockReturnValue(null), // fallback test
    } as unknown as HTMLCanvasElement;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calculates optimal grid columns and rows for any participant count up to 50', () => {
    expect(WebGLVideoGridRenderer.calculateLayout(1)).toEqual({ cols: 1, rows: 1 });
    expect(WebGLVideoGridRenderer.calculateLayout(2)).toEqual({ cols: 2, rows: 1 });
    expect(WebGLVideoGridRenderer.calculateLayout(4)).toEqual({ cols: 2, rows: 2 });
    expect(WebGLVideoGridRenderer.calculateLayout(6)).toEqual({ cols: 3, rows: 2 });
    expect(WebGLVideoGridRenderer.calculateLayout(9)).toEqual({ cols: 3, rows: 3 });
    expect(WebGLVideoGridRenderer.calculateLayout(16)).toEqual({ cols: 4, rows: 4 });
    expect(WebGLVideoGridRenderer.calculateLayout(25)).toEqual({ cols: 5, rows: 5 });
    expect(WebGLVideoGridRenderer.calculateLayout(36)).toEqual({ cols: 6, rows: 6 });
    expect(WebGLVideoGridRenderer.calculateLayout(49)).toEqual({ cols: 7, rows: 7 });
  });

  it('computes correct NDC coordinates for 4-tile grid', () => {
    const renderer = new WebGLVideoGridRenderer(mockCanvas);
    renderer.setStreams([
      { userId: 'u1', label: 'User 1', videoElement: {} as HTMLVideoElement },
      { userId: 'u2', label: 'User 2', videoElement: {} as HTMLVideoElement, isDominant: true },
      { userId: 'u3', label: 'User 3', videoElement: {} as HTMLVideoElement },
      { userId: 'u4', label: 'User 4', videoElement: {} as HTMLVideoElement },
    ]);

    const tiles = renderer.computeTileCoordinates(4);

    expect(tiles.length).toBe(4);
    // 2x2 grid
    expect(tiles[0].col).toBe(0);
    expect(tiles[0].row).toBe(0);
    expect(tiles[1].col).toBe(1);
    expect(tiles[1].row).toBe(0);
    expect(tiles[1].isDominant).toBe(true);

    // Tiles are within NDC [-1, 1] range
    tiles.forEach((tile) => {
      expect(tile.x0).toBeGreaterThanOrEqual(-1.0);
      expect(tile.x1).toBeLessThanOrEqual(1.0);
      expect(tile.y0).toBeGreaterThanOrEqual(-1.0);
      expect(tile.y1).toBeLessThanOrEqual(1.0);
    });

    renderer.destroy();
  });

  it('handles empty or single stream gracefully', () => {
    const renderer = new WebGLVideoGridRenderer(mockCanvas);
    const tiles0 = renderer.computeTileCoordinates(0);
    expect(tiles0).toEqual([]);

    const tiles1 = renderer.computeTileCoordinates(1);
    expect(tiles1.length).toBe(1);
    expect(tiles1[0].col).toBe(0);
    expect(tiles1[0].row).toBe(0);

    renderer.destroy();
  });
});
