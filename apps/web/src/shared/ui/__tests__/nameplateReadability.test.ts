import { afterEach, describe, expect, it, vi } from 'vitest';
import { readabilityBounds, registerNameplateReadability } from '../nameplateReadability';

const rect = (x: number, y: number, width: number, height: number) =>
  ({ x, y, left: x, top: y, right: x + width, bottom: y + height, width, height }) as DOMRect;
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Nameplate readability', () => {
  it('uses glyph width, not the empty space in a flex-1 block', () => {
    expect(
      readabilityBounds(rect(0, 0, 540, 56), rect(56, 18, 460, 20), rect(56, 18, 72, 20)),
    ).toEqual({ x: 48, y: 12, width: 88, height: 32 });
  });
  it('clamps long truncated names to their visible box and keeps badges outside', () => {
    expect(
      readabilityBounds(rect(0, 0, 300, 56), rect(56, 18, 180, 20), rect(56, 18, 450, 20)),
    ).toEqual({ x: 48, y: 12, width: 196, height: 32 });
  });
  it('handles centered names and hides empty or collapsed content', () => {
    expect(
      readabilityBounds(rect(100, 0, 400, 56), rect(260, 18, 80, 20), rect(260, 18, 80, 20))?.x,
    ).toBe(152);
    expect(
      readabilityBounds(rect(0, 0, 300, 56), rect(56, 18, 0, 20), rect(56, 18, 0, 20)),
    ).toBeNull();
  });
  it('resizes the patch when a nickname changes without resizing its flex block', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const row = document.createElement('div');
    row.className = 'nameplate-row';
    row.innerHTML =
      '<span class="nameplate-surface"><span class="nameplate-shade" hidden></span></span><span data-nameplate-label>Alice</span><svg data-badge></svg>';
    document.body.append(row);
    const label = row.querySelector<HTMLElement>('[data-nameplate-label]')!;
    const surface = row.querySelector<HTMLElement>('.nameplate-surface')!;
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 540, 56));
    vi.spyOn(label, 'getBoundingClientRect').mockReturnValue(rect(56, 18, 460, 20));
    let width = 40;
    vi.spyOn(document, 'createRange').mockReturnValue({
      selectNodeContents: vi.fn(),
      getBoundingClientRect: () => rect(56, 18, width, 20),
    } as unknown as Range);
    const dispose = registerNameplateReadability(surface);
    callbacks.shift()!(0);
    const patch = surface.firstElementChild as HTMLElement;
    expect(patch.style.width).toBe('56px');
    width = 140;
    label.textContent = 'A much longer nickname';
    await Promise.resolve();
    callbacks.shift()!(0);
    expect(patch.style.width).toBe('156px');
    expect(patch.hidden).toBe(false);
    dispose();
  });
});
