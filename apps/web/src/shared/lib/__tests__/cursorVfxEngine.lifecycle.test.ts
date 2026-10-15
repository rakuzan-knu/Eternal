import { afterEach, describe, expect, it, vi } from 'vitest';
import { cursorVfxEngine } from '../cursorVfxEngine';
afterEach(() => {
  cursorVfxEngine.configure({ enabled: false });
  vi.restoreAllMocks();
});
describe('cursor canvas lifecycle', () => {
  it('releases its viewport backing surface after each disable cycle', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    for (let i = 0; i < 30; i++) {
      cursorVfxEngine.configure({ enabled: true, trail: true });
      const canvas = document.querySelector<HTMLCanvasElement>('#cursor-vfx-canvas')!;
      expect(canvas).not.toBeNull();
      cursorVfxEngine.configure({ enabled: false });
      expect(document.querySelector('#cursor-vfx-canvas')).toBeNull();
      expect(canvas.width * canvas.height).toBe(0);
    }
  });
});
