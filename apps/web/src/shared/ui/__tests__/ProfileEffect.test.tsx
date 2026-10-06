import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileEffect } from '../ProfileEffect';
import type { ProfileEffectDto } from '@social-network/shared-contracts';
const state = vi.hoisted(() => ({ motion: true, dispose: vi.fn() }));
vi.mock('../useDecorationMotion', () => ({ useDecorationMotion: () => state.motion }));
vi.mock('../profileEffectPlayback', () => ({
  registerProfileEffect: (_node: Element, eligible: boolean, notify: (v: boolean) => void) => {
    notify(eligible);
    return { promote: vi.fn(), dispose: state.dispose };
  },
}));
const item: ProfileEffectDto = {
  id: 'race',
  slug: 'race',
  name: 'Race',
  description: 'Race',
  family: 'racing',
  variant: 'kart',
  assetType: 'animated_webp',
  assetUrl: '/race.webp',
  previewUrl: '/race.preview.webp',
  width: 640,
  height: 1120,
  fps: 60,
  durationMs: 8000,
  avatarAnchorX: 0.16,
  avatarAnchorY: 0.22,
  rarity: 'epic',
  priceCents: 199,
  isAvailable: false,
};
beforeEach(() => {
  state.motion = true;
  vi.clearAllMocks();
});
afterEach(cleanup);
describe('Profile effect display', () => {
  it('retires animation without covering the bio when reduced motion is enabled', () => {
    const { container, rerender } = render(
      <div>
        <button>Message</button>
        <ProfileEffect effect={item} />
      </div>,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', '/race.webp');
    expect(container.querySelector('[data-profile-effect]')).toHaveClass('pointer-events-none');
    state.motion = false;
    rerender(
      <div>
        <button>Message</button>
        <ProfileEffect effect={item} priority />
      </div>,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Message' })).toBeEnabled();
    expect(state.dispose).toHaveBeenCalled();
  });
  it('shows an honest static poster in motion-disabled shop previews', () => {
    state.motion = false;
    const { container } = render(<ProfileEffect effect={item} preview />);
    expect(container.querySelector('img')).toHaveAttribute('src', item.previewUrl);
    expect(container.querySelector('img')).toHaveAttribute('data-profile-effect-motion', 'false');
  });
  it('removes a failed animation and releases its playback slot', () => {
    const { container } = render(<ProfileEffect effect={item} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(state.dispose).toHaveBeenCalled();
  });
  it('mounts no player for a profile without an effect', () => {
    const { container } = render(<ProfileEffect effect={null} />);
    expect(container.firstChild).toBeNull();
  });
});
