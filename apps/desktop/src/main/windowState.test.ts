import { describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ app: {}, screen: {} }));
import { fitWindowBounds } from './windowState';

describe('saved window bounds', () => {
  it('discards a disconnected monitor and fits oversized/partially hidden windows', () => {
    const areas = [{ x: 0, y: 0, width: 1280, height: 720 }];
    expect(fitWindowBounds({ x: 2000, y: 0, width: 800, height: 600 }, areas)).toBeUndefined();
    expect(fitWindowBounds({ x: -20, y: -20, width: 2000, height: 1200 }, areas)).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
    });
    expect(fitWindowBounds({ x: 1200, y: 650, width: 800, height: 600 }, areas)).toEqual({
      x: 480,
      y: 120,
      width: 800,
      height: 600,
    });
  });

  it('preserves a visible secondary monitor with negative coordinates', () => {
    const bounds = { x: -1200, y: 20, width: 900, height: 640 };
    expect(fitWindowBounds(bounds, [{ x: -1280, y: 0, width: 1280, height: 720 }])).toEqual(bounds);
  });
});
