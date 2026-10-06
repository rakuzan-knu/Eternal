import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import { AvatarWithDecoration } from '../AvatarDecoration';
import { useThemeStore } from '@/shared/model/useThemeStore';
vi.mock('../LottieDecoration', () => ({ default: () => <span data-testid="lottie-animation" /> }));
const decoration: AvatarDecorationDto = {
  id: 'test',
  slug: 'test',
  name: 'Test',
  description: '',
  assetType: 'animated_webp',
  assetUrl: '/loop.webp',
  previewUrl: '/static.webp',
  rarity: 'epic',
  priceCents: 199,
  isAvailable: false,
};
describe('Avatar decoration playback', () => {
  let entries: IntersectionObserverCallback;
  let reduced = false;
  let onMotionChange: () => void;
  beforeEach(() => {
    reduced = false;
    useThemeStore.setState({ themeMode: 'solid', solidTheme: 'dark' });
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          entries = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, cb: () => void) => {
        onMotionChange = cb;
      },
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function intersect(element: Element, isIntersecting: boolean) {
    act(() =>
      entries(
        [{ target: element, isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
  }
  const hood = { ...decoration, slug: 'cipher-hood', assetUrl: '/cipher-hood.webp?v=2' };
  it('dons the hood once after loading, then keeps it fitted when scrolling back', () => {
    vi.useFakeTimers();
    const { container } = render(<AvatarWithDecoration decoration={hood} />);
    const img = () => container.querySelector('.decorated-avatar__overlay img')!;
    intersect(container.firstElementChild!, true);
    expect(img()).toHaveAttribute('src', '/cipher-hood.intro.webp?v=2');
    act(() => vi.advanceTimersByTime(3000));
    expect(img()).toHaveAttribute('src', '/cipher-hood.intro.webp?v=2');
    fireEvent.load(img());
    act(() => vi.advanceTimersByTime(1999));
    expect(img()).toHaveAttribute('src', '/cipher-hood.intro.webp?v=2');
    act(() => vi.advanceTimersByTime(1));
    expect(img()).toHaveAttribute('src', hood.assetUrl);
    intersect(container.firstElementChild!, false);
    intersect(container.firstElementChild!, true);
    expect(img()).toHaveAttribute('src', hood.assetUrl);
  });
  it('ends an interrupted introduction and falls back if a companion clip fails', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<AvatarWithDecoration decoration={hood} />);
    const img = () => container.querySelector('.decorated-avatar__overlay img')!;
    intersect(container.firstElementChild!, true);
    fireEvent.load(img());
    intersect(container.firstElementChild!, false);
    expect(vi.getTimerCount()).toBe(0);
    intersect(container.firstElementChild!, true);
    expect(img()).toHaveAttribute('src', hood.assetUrl);
    rerender(<AvatarWithDecoration decoration={{ ...hood, assetUrl: '/cipher-hood.webp?v=3' }} />);
    fireEvent.error(img());
    expect(img()).toHaveAttribute('src', '/cipher-hood.webp?v=3');
    fireEvent.error(img());
    expect(img()).toHaveAttribute('src', hood.previewUrl);
  });
  it('unmounts animated WebP outside the viewport and restores the static preview', () => {
    const { container } = render(
      <AvatarWithDecoration decoration={decoration} avatarUrl="/avatar.png" />,
    );
    const avatar = container.firstElementChild!;
    expect(container.querySelector('.decorated-avatar__overlay img')).toHaveAttribute(
      'src',
      decoration.previewUrl,
    );
    intersect(avatar, true);
    expect(container.querySelector('.decorated-avatar__overlay img')).toHaveAttribute(
      'src',
      decoration.assetUrl,
    );
    intersect(avatar, false);
    expect(container.querySelector('.decorated-avatar__overlay img')).toHaveAttribute(
      'src',
      decoration.previewUrl,
    );
  });
  it('honors reduced motion and preference changes', () => {
    reduced = true;
    const { container } = render(<AvatarWithDecoration decoration={decoration} />);
    intersect(container.firstElementChild!, true);
    expect(container.firstElementChild).toHaveAttribute('data-playing', 'false');
    reduced = false;
    act(() => onMotionChange());
    expect(container.firstElementChild).toHaveAttribute('data-playing', 'true');
  });
  it('stops decoding when the tab becomes hidden', () => {
    const { container } = render(<AvatarWithDecoration decoration={decoration} />);
    intersect(container.firstElementChild!, true);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(container.firstElementChild).toHaveAttribute('data-playing', 'false');
  });
  it.each([
    ['sm', 32],
    ['md', 48],
    ['lg', 80],
    ['xl', 128],
  ] as const)('fits %s without clipping', (size, pixels) => {
    const { container } = render(<AvatarWithDecoration size={size} status="dnd" />);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--avatar-size'),
    ).toBe(pixels + 'px');
    expect(screen.getByRole('img', { name: 'Статус: dnd' })).toBeInTheDocument();
  });
  it('destroys Lottie rendering offscreen and never mounts it with reduced motion', async () => {
    const { container } = render(
      <AvatarWithDecoration decoration={{ ...decoration, assetType: 'lottie' }} />,
    );
    intersect(container.firstElementChild!, true);
    expect(await screen.findByTestId('lottie-animation')).toBeInTheDocument();
    intersect(container.firstElementChild!, false);
    expect(screen.queryByTestId('lottie-animation')).toBeNull();
    reduced = true;
    act(() => onMotionChange());
    intersect(container.firstElementChild!, true);
    expect(screen.queryByTestId('lottie-animation')).toBeNull();
    expect(container.querySelector('.decorated-avatar__overlay img')).toHaveAttribute(
      'src',
      decoration.previewUrl,
    );
  });
  it('turns original calligraphy black on a light theme, including static previews', () => {
    const { container } = render(
      <AvatarWithDecoration decoration={{ ...decoration, slug: 'ronin-orbit' }} motion={false} />,
    );
    expect(container.querySelector('[data-ink="black"]')).toBeNull();
    act(() => useThemeStore.setState({ solidTheme: 'light' }));
    expect(container.querySelector('.decorated-avatar__overlay')).toHaveAttribute(
      'data-ink',
      'black',
    );
    act(() => useThemeStore.setState({ solidTheme: 'dark' }));
    expect(container.querySelector('[data-ink="black"]')).toBeNull();
  });
});
