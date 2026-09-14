import { describe, it, expect } from 'vitest';
import {
  snapPosition,
  snapRotation,
  getStoryFontFamily,
  extractDominantGradient,
  GRADIENT_PRESETS,
} from '../storyCanvasUtils';

describe('storyCanvasUtils', () => {
  it('snaps position to center when within tolerance', () => {
    // Within tolerance of 50
    const res1 = snapPosition(51, 49);
    expect(res1.snapX).toBe(true);
    expect(res1.snapY).toBe(true);
    expect(res1.x).toBe(50);
    expect(res1.y).toBe(50);

    // Far from center
    const res2 = snapPosition(20, 80);
    expect(res2.snapX).toBe(false);
    expect(res2.snapY).toBe(false);
    expect(res2.x).toBe(20);
    expect(res2.y).toBe(80);
  });

  it('snaps rotation degrees to key angles (0, 90, 180, -90)', () => {
    const r1 = snapRotation(2.5);
    expect(r1.isSnapped).toBe(true);
    expect(r1.deg).toBe(0);

    const r2 = snapRotation(92);
    expect(r2.isSnapped).toBe(true);
    expect(r2.deg).toBe(90);

    const r3 = snapRotation(-89);
    expect(r3.isSnapped).toBe(true);
    expect(r3.deg).toBe(-90);

    const r4 = snapRotation(45);
    expect(r4.isSnapped).toBe(false);
    expect(r4.deg).toBe(45);
  });

  it('maps story font families properly', () => {
    expect(getStoryFontFamily('classic')).toContain('Montserrat');
    expect(getStoryFontFamily('signature')).toContain('Caveat');
    expect(getStoryFontFamily('cyberpunk')).toContain('Orbitron');
    expect(getStoryFontFamily('typewriter')).toContain('Courier Prime');
    expect(getStoryFontFamily('poster')).toContain('Russo One');
    expect(getStoryFontFamily('modern')).toContain('system-ui');
  });

  it('extractDominantGradient returns a fallback preset gracefully on invalid source', async () => {
    const gradient = await extractDominantGradient('invalid-url-path');
    expect(gradient).toBe(GRADIENT_PRESETS[0]);
  });
});
