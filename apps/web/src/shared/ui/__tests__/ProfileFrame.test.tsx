import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileFrame, ProfileFrameSurface } from '../ProfileFrame';
import { profileFrameFixture as frame } from './profileFrameFixture';
const state = vi.hoisted(() => ({ motion: true, dispose: vi.fn() }));
vi.mock('../useDecorationMotion', () => ({ useDecorationMotion: () => state.motion }));
vi.mock('../profileEffectPlayback', () => ({
  registerProfileEffect: (_node: Element, eligible: boolean, notify: (v: boolean) => void) => {
    notify(eligible);
    return { promote: vi.fn(), dispose: state.dispose };
  },
}));
beforeEach(() => {
  state.motion = true;
  vi.clearAllMocks();
});
afterEach(cleanup);
describe('Layered profile frames', () => {
  const racing = {
    ...frame,
    id: 'racing',
    family: 'racing' as const,
    durationMs: 8000,
    crownUrl: '/racing.svg',
    vehicleAtlasUrl: '/atlas.webp',
    vehiclePreviewUrl: '/car.webp',
  };
  it('uses layout dimensions during entrance scaling and cancels animation when retired', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
    const bounds = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 216, height: 360 } as DOMRect);
    const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(77);
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    try {
      const { container, rerender } = render(<ProfileFrame frame={racing} />);
      expect(container.querySelector('.profile-frame-racing svg')).toHaveAttribute(
        'viewBox',
        '0 0 240 400',
      );
      fireEvent.load(container.querySelector('.profile-frame-racing__preload')!);
      expect(container.querySelector('.profile-frame-racing')).toHaveAttribute(
        'data-profile-frame-motion',
        'true',
      );
      expect(request).toHaveBeenCalled();
      state.motion = false;
      // The mock hook has no subscription; refresh the DTO to enter the memoized parent.
      rerender(<ProfileFrame frame={{ ...racing }} />);
      await waitFor(() => expect(cancel).toHaveBeenCalledWith(77));
      expect(container.querySelector('.profile-frame-racing')).toHaveAttribute(
        'data-profile-frame-motion',
        'false',
      );
      expect(container.querySelector('.profile-frame-racing__preload')).toBeNull();
    } finally {
      width.mockRestore();
      height.mockRestore();
      bounds.mockRestore();
      request.mockRestore();
      cancel.mockRestore();
    }
  });
  it('does not load the atlas for reduced motion and preserves static racing artwork', () => {
    state.motion = false;
    const { container } = render(<ProfileFrame frame={racing} />);
    expect(container.querySelector('.profile-frame__crown')).toHaveAttribute(
      'src',
      racing.crownUrl,
    );
    expect(container.querySelector('.profile-frame-racing__preload')).toBeNull();
    expect(container.querySelectorAll('.profile-frame-racing__car img')).toHaveLength(2);
    expect(container.querySelector('[data-profile-frame-motion="true"]')).toBeNull();
  });
  it('releases motion after an atlas failure while retaining both parked cars', () => {
    const { container } = render(<ProfileFrame frame={racing} />);
    fireEvent.error(container.querySelector('.profile-frame-racing__preload')!);
    expect(container.querySelector('[data-motion]')).toHaveAttribute('data-motion', 'false');
    expect(container.querySelectorAll('.profile-frame-racing__car img')).toHaveLength(2);
    expect(container.querySelector('.profile-frame__crown')).toHaveAttribute(
      'src',
      racing.crownUrl,
    );
  });
  it('reserves headroom and keeps the entire content interactive', () => {
    const { container } = render(
      <ProfileFrameSurface frame={frame}>
        <button>Message</button>
        <p>Bio</p>
      </ProfileFrameSurface>,
    );
    expect(container.firstChild).toHaveAttribute('data-framed', 'true');
    expect(container.querySelector('.profile-frame')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.profile-frame__crown')).toHaveAttribute('src', frame.crownUrl);
    expect(screen.getByRole('button', { name: 'Message' })).toBeEnabled();
  });
  it('keeps an honest static frame when motion is disabled', () => {
    state.motion = false;
    const { container } = render(<ProfileFrame frame={frame} />);
    expect(container.querySelector('.profile-frame__crown')).toHaveAttribute(
      'src',
      frame.crownPreviewUrl,
    );
    expect(container.querySelector('[data-motion]')).toHaveAttribute('data-motion', 'false');
  });
  it('falls back after a failed animation, then removes only a failed crown', () => {
    const { container } = render(<ProfileFrame frame={frame} />);
    fireEvent.error(container.querySelector('.profile-frame__crown')!);
    expect(container.querySelector('.profile-frame__crown')).toHaveAttribute(
      'src',
      frame.crownPreviewUrl,
    );
    expect(state.dispose).toHaveBeenCalled();
    fireEvent.error(container.querySelector('.profile-frame__crown')!);
    expect(container.querySelector('.profile-frame__crown')).toBeNull();
    expect(container.querySelectorAll('.profile-frame__corner')).toHaveLength(4);
  });
  it('mounts no art or reserved space for an unequipped frame', () => {
    const { container } = render(
      <ProfileFrameSurface frame={null}>
        <p>Profile</p>
      </ProfileFrameSurface>,
    );
    expect(container.firstChild).toHaveAttribute('data-framed', 'false');
    expect(container.querySelector('[data-profile-frame]')).toBeNull();
  });
});
