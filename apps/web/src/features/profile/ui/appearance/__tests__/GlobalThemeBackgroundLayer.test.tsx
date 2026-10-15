import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { GlobalThemeBackgroundLayer } from '../GlobalThemeBackgroundLayer';
const route = vi.hoisted(() => ({ pathname: '/search' }));
vi.mock('react-router-dom', () => ({ useLocation: () => route }));
vi.mock('@/shared/model/useThemeStore', async () => {
  const { create } = await import('zustand');
  return {
    useThemeStore: create(() => ({ themeMode: 'solid', wallpaper: null })),
    rehydrateWallpaperBlob: vi.fn(),
  };
});
const wallpaper = {
  id: 'wall',
  name: 'wall',
  url: '/videos/sample-reel.mp4',
  mediaType: 'video' as const,
  isAnimated: true,
  themeMode: 'dark' as const,
  dimming: 0.7,
  blur: 0,
};
describe('wallpaper decoder lifecycle', () => {
  beforeEach(() => {
    route.pathname = '/search';
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    useThemeStore.setState({ themeMode: 'wallpaper', wallpaper });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  it('releases the detached video and cannot restart it after switching to a solid theme', () => {
    const view = render(<GlobalThemeBackgroundLayer />);
    const video = view.container.querySelector('video')!;
    act(() => useThemeStore.setState({ themeMode: 'solid' }));
    expect(video.pause).toHaveBeenCalled();
    expect(video.hasAttribute('src')).toBe(false);
    vi.mocked(video.play).mockClear();
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(video.play).not.toHaveBeenCalled();
  });
  it('unloads the decoder while hidden and restores the same wallpaper on wake', () => {
    const view = render(<GlobalThemeBackgroundLayer />);
    const video = view.container.querySelector('video')!;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(video.hasAttribute('src')).toBe(false);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(video.getAttribute('src')).toBe(wallpaper.url);
  });
  it('releases media on unmount and when entering Reels', () => {
    const view = render(<GlobalThemeBackgroundLayer />);
    const video = view.container.querySelector('video')!;
    route.pathname = '/reels';
    view.rerender(<GlobalThemeBackgroundLayer />);
    expect(video.hasAttribute('src')).toBe(false);
    view.unmount();
    expect(video.hasAttribute('src')).toBe(false);
  });
});
