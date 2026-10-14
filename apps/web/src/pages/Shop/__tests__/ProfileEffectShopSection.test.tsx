import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProfileEffectShopSection } from '../ui/ProfileEffectShopSection';

const state = vi.hoisted(() => ({
  owned: true,
  active: false,
  error: false,
  pending: false,
  mutate: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
}));
const item = {
  id: 'sky',
  slug: 'sky',
  name: 'Glowing Sky',
  description: 'Sky',
  assetType: 'animated_webp',
  family: 'racing',
  variant: 'kart',
  assetUrl: '/sky.mp4',
  previewUrl: '/sky.webp',
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
vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { avatar: '/avatar.png', username: 'alice' } }),
}));
vi.mock('@/shared/ui/AvatarDecoration', () => ({
  AvatarWithDecoration: () => <img alt="Avatar" src="/avatar.png" />,
}));
vi.mock('@/shared/ui/ProfileEffect', () => ({ ProfileEffect: () => <span aria-hidden="true" /> }));
vi.mock('../model/useProfileEffects', () => ({
  useProfileEffects: () => ({
    catalog: {
      data: state.error ? undefined : [item],
      isPending: false,
      isError: state.error,
      refetch: state.refetch,
    },
    inventory: {
      data: {
        activeProfileEffectId: state.active ? 'sky' : null,
        items: state.owned ? [{ profileEffect: item }] : [],
      },
      isError: false,
    },
    equip: {
      mutate: state.mutate,
      reset: state.reset,
      isPending: state.pending,
      isError: false,
      isSuccess: false,
    },
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { owned: true, active: false, error: false, pending: false });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function () {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function () {
      this.removeAttribute('open');
    },
  });
});
describe('ProfileEffect shop workflow', () => {
  it('restores URL search and clears it with focus restoration', async () => {
    renderWithProviders(<ProfileEffectShopSection />, {
      initialEntries: ['/shop?category=profileEffects&effect-search=missing'],
    });
    expect(screen.getByRole('status')).toHaveTextContent('No effects found');
    await userEvent.click(screen.getByRole('button', { name: 'Clear effect search' }));
    expect(screen.getByRole('button', { name: 'Open Glowing Sky effect' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
  it('equips and removes through the server mutation', async () => {
    renderWithProviders(<ProfileEffectShopSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Glowing Sky effect' }));
    await userEvent.click(screen.getByRole('button', { name: 'Equip effect' }));
    expect(state.mutate).toHaveBeenLastCalledWith('sky');
    state.active = true;
    await userEvent.click(screen.getByRole('button', { name: 'Close effect' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open Glowing Sky effect' }));
    await userEvent.click(screen.getByRole('button', { name: 'Unequip effect' }));
    expect(state.mutate).toHaveBeenLastCalledWith(null);
  });
  it('does not expose a purchase or free claim for an unowned item', async () => {
    state.owned = false;
    renderWithProviders(<ProfileEffectShopSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Glowing Sky effect' }));
    expect(screen.getByRole('button', { name: 'Sales closed for now' })).toBeDisabled();
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it('keeps the catalog error recoverable without invented fallback items', async () => {
    state.error = true;
    renderWithProviders(<ProfileEffectShopSection />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
    expect(screen.queryByRole('button', { name: /^Open/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Retry$/ }));
    expect(state.refetch).toHaveBeenCalled();
  });
});
