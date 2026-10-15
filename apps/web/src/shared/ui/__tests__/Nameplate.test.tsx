import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { Nameplate } from '../Nameplate';
import type { NameplateDto } from '@social-network/shared-contracts';

const motion = vi.hoisted(() => ({ allowed: true }));
vi.mock('../useDecorationMotion', () => ({ useDecorationMotion: () => motion.allowed }));
const plate: NameplateDto = {
  id: 'sky',
  slug: 'sky',
  name: 'Sky',
  description: '',
  assetType: 'video',
  assetUrl: '/sky.mp4',
  previewUrl: '/sky.webp',
  width: 640,
  height: 112,
  fps: 10,
  durationMs: 1500,
  shadeOpacity: 0.58,
  rarity: 'epic',
  priceCents: 199,
  isAvailable: false,
};
let report: IntersectionObserverCallback;
beforeEach(() => {
  motion.allowed = true;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        report = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
function reveal(container: HTMLElement, visible = true) {
  act(() =>
    report(
      [
        { target: container.querySelector('.nameplate-surface')!, isIntersecting: visible },
      ] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
}
describe('Nameplate media lifecycle', () => {
  it('uses a poster offscreen and releases the decoder when scrolled away', () => {
    const { container } = render(
      <div className="nameplate-row">
        <Nameplate nameplate={plate} />
      </div>,
    );
    expect(container.querySelector('video')).toBeNull();
    reveal(container);
    const video = container.querySelector('video')!;
    expect(video).not.toBeNull();
    reveal(container, false);
    expect(container.querySelector('video')).toBeNull();
    expect(video.hasAttribute('src')).toBe(false);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(plate.previewUrl);
  });
  it('stops for reduced motion or a hidden page and can resume', () => {
    const { container, rerender } = render(<Nameplate nameplate={plate} />);
    reveal(container);
    motion.allowed = false;
    rerender(<Nameplate nameplate={plate} motion={false} />);
    expect(container.querySelector('video')).toBeNull();
    motion.allowed = true;
    rerender(<Nameplate nameplate={plate} motion />);
    reveal(container);
    expect(container.querySelector('video')).not.toBeNull();
  });
  it('falls back to the poster on an unsupported or broken video', () => {
    const { container } = render(<Nameplate nameplate={plate} />);
    reveal(container);
    fireEvent.error(container.querySelector('video')!);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });
  it('plays visible forced nameplates without requiring hover', () => {
    const { container } = render(
      <div className="nameplate-row">
        <Nameplate nameplate={plate} alwaysPlay={true} />
      </div>,
    );
    expect(container.querySelector('video')).toBeNull();
    reveal(container);
    expect(container.querySelector('video')).not.toBeNull();
  });
  it('can force visible playback even with motion false', () => {
    const { container } = render(
      <div className="nameplate-row">
        <Nameplate nameplate={plate} alwaysPlay={true} motion={false} />
      </div>,
    );
    reveal(container);
    expect(container.querySelector('video')).not.toBeNull();
  });
  it('releases even an always-playing decoder when hidden and on unmount', () => {
    const { container, rerender, unmount } = render(<Nameplate nameplate={plate} alwaysPlay />);
    reveal(container);
    const first = container.querySelector('video')!;
    motion.allowed = false;
    rerender(<Nameplate nameplate={{ ...plate }} alwaysPlay />);
    expect(container.querySelector('video')).toBeNull();
    expect(first.hasAttribute('src')).toBe(false);
    motion.allowed = true;
    rerender(<Nameplate nameplate={{ ...plate }} alwaysPlay />);
    reveal(container);
    const resumed = container.querySelector('video')!;
    expect(resumed).not.toBeNull();
    unmount();
    expect(resumed.hasAttribute('src')).toBe(false);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  it('resets failed state and plays new nameplate when assetUrl changes', () => {
    const { container, rerender } = render(
      <div className="nameplate-row">
        <Nameplate nameplate={plate} alwaysPlay={true} />
      </div>,
    );
    reveal(container);
    const video = container.querySelector('video')!;
    fireEvent.error(video);
    expect(container.querySelector('video')).toBeNull();

    const plate2 = { ...plate, id: 'ocean', assetUrl: '/ocean.mp4' };
    rerender(
      <div className="nameplate-row">
        <Nameplate nameplate={plate2} alwaysPlay={true} />
      </div>,
    );
    reveal(container);
    expect(container.querySelector('video')).not.toBeNull();
  });
  it('plays on pointerenter and stops on pointerleave when playOnHover is true', () => {
    const { container } = render(
      <div className="nameplate-row">
        <Nameplate nameplate={plate} playOnHover={true} />
      </div>,
    );
    const row = container.querySelector('.nameplate-row')!;
    expect(container.querySelector('video')).toBeNull();
    fireEvent.pointerEnter(row);
    expect(container.querySelector('video')).not.toBeNull();
    fireEvent.pointerLeave(row);
    expect(container.querySelector('video')).toBeNull();
  });
  it('bounds decoders even for forced playback in a long visible list', () => {
    const { container } = render(
      <>
        {Array.from({ length: 40 }, (_, i) => (
          <Nameplate key={i} nameplate={plate} alwaysPlay />
        ))}
      </>,
    );
    act(() =>
      report(
        [...container.querySelectorAll('.nameplate-surface')].map((target) => ({
          target,
          isIntersecting: true,
        })) as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      ),
    );
    expect(container.querySelectorAll('video').length).toBeLessThanOrEqual(8);
    act(() =>
      report(
        [...container.querySelectorAll('.nameplate-surface')].map((target) => ({
          target,
          isIntersecting: false,
        })) as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      ),
    );
    expect(container.querySelectorAll('video')).toHaveLength(0);
  });
});
