import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import LottieDecoration from '../LottieDecoration';
const player = vi.hoisted(() => ({
  load: vi.fn(() => ({
    addEventListener: vi.fn((event: string, callback: () => void) => {
      if (event === 'DOMLoaded') callback();
    }),
    pause: vi.fn(),
    destroy: vi.fn(),
  })),
}));
vi.mock('lottie-web', () => ({ default: { loadAnimation: player.load } }));
const decoration = (id: string): AvatarDecorationDto => ({
  id,
  slug: id,
  name: id,
  description: 'Authored frame',
  assetType: 'lottie',
  assetUrl: '/frames/' + id + '.json',
  previewUrl: '/frames/' + id + '.webp',
  rarity: 'epic',
  priceCents: 199,
  isAvailable: false,
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('Lottie asset lifecycle', () => {
  it('reuses recently viewed art, evicts older art and destroys every discarded player', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ layers: [] }) });
    vi.stubGlobal('fetch', fetcher);
    for (let i = 0; i < 9; i++) {
      const view = render(<LottieDecoration decoration={decoration('cache-' + i)} />);
      await waitFor(() => expect(player.load).toHaveBeenCalledTimes(i + 1));
      const animation = player.load.mock.results[i].value;
      view.unmount();
      expect(animation.pause).toHaveBeenCalledOnce();
      expect(animation.destroy).toHaveBeenCalledOnce();
    }
    expect(fetcher).toHaveBeenCalledTimes(9);
    const recent = render(<LottieDecoration decoration={decoration('cache-7')} />);
    await waitFor(() => expect(player.load).toHaveBeenCalledTimes(10));
    expect(fetcher).toHaveBeenCalledTimes(9);
    recent.unmount();
    render(<LottieDecoration decoration={decoration('cache-0')} />);
    await waitFor(() => expect(player.load).toHaveBeenCalledTimes(11));
    expect(fetcher).toHaveBeenCalledTimes(10);
  });
  it('never starts an animation when the avatar unmounts before its fetch finishes', async () => {
    let complete!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            complete = resolve;
          }),
      ),
    );
    const view = render(<LottieDecoration decoration={decoration('cancelled')} />);
    view.unmount();
    complete({ ok: true, json: async () => ({ layers: [] }) } as Response);
    await waitFor(() => expect(view.container).toBeEmptyDOMElement());
    expect(player.load).not.toHaveBeenCalled();
  });
});
