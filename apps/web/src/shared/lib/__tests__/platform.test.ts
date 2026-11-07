import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDesktopBridge, isDesktop } from '../platform';

afterEach(() => vi.unstubAllGlobals());

describe('desktop platform detection', () => {
  it('uses the preload bridge rather than the user agent', () => {
    vi.stubGlobal('desktop', undefined);
    expect(isDesktop()).toBe(false);
    const bridge = { getInfo: vi.fn(), openExternal: vi.fn() };
    vi.stubGlobal('desktop', bridge);
    expect(isDesktop()).toBe(true);
    expect(getDesktopBridge()).toBe(bridge);
  });
});
