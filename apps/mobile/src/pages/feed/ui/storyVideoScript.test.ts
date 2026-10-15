import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { storyVideoStringLiteral, storyVideoSyncScript } from './storyVideoScript';

describe('native story video script boundary', () => {
  it('preserves string data while preventing HTML script termination and Unicode separators', () => {
    const value = '</script><script>globalThis.injected=true</script>\u2028\u2029"\\';
    const literal = storyVideoStringLiteral(value);
    expect(literal).not.toMatch(/[<>\u2028\u2029]/);
    expect(JSON.parse(literal)).toBe(value);
  });

  it('assigns filter data without executing it and plays an active video', () => {
    const css = '");globalThis.injected=true;//</script>\u2028';
    const video = {
      volume: 0,
      style: { filter: '' },
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    };
    const context = { document: { querySelector: () => video }, injected: false };
    runInNewContext(storyVideoSyncScript(true, 0.5, css), context);
    expect(context.injected).toBe(false);
    expect(video.style.filter).toBe(css);
    expect(video.volume).toBe(0.5);
    expect(video.play).toHaveBeenCalledOnce();
    expect(video.pause).not.toHaveBeenCalled();
  });

  it.each([
    [0, 0],
    [1, 1],
    [-10, 0],
    [10, 1],
    [NaN, 1],
    [Infinity, 1],
    [undefined, 1],
    ['0;globalThis.injected=true;v.volume=1', 1],
  ])('validates volume %s before inserting it into executable code', (volume, expected) => {
    const video = { volume: 0, style: { filter: '' }, pause: vi.fn() };
    const context = { document: { querySelector: () => video }, injected: false };
    runInNewContext(storyVideoSyncScript(false, volume, 'none'), context);
    expect(context.injected).toBe(false);
    expect(video.volume).toBe(expected);
    expect(video.pause).toHaveBeenCalledOnce();
  });
});
