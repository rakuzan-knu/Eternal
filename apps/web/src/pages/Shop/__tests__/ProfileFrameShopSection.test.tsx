import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProfileFrameShopSection } from '../ui/ProfileFrameShopSection';

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
  family: 'dragon',
  variant: 'jade',
  color: '#428879',
  accent: '#bafbdc',
  crownUrl: '/sky.crown.webp',
  crownPreviewUrl: '/sky.poster.webp',
  cornerUrl: '/sky.corner.svg',
  railUrl: '/sky.rail.svg',
  footerUrl: '/sky.footer.svg',
  animated: true,
  fps: 60,
  durationMs: 3000,
  rarity: 'epic',
  priceCents: 199,
  isAvailable: false,
};
vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { avatar: '/avatar.png', username: 'alice' } }),
}));
vi.mock('@/shared/ui/AvatarDecoration', () => ({
  AvatarWithDecoration: () => <img alt="Аватар" src="/avatar.png" />,
}));
vi.mock('../ui/ProfileFramePreview', () => ({
  ProfileFramePreview: () => <span aria-hidden="true" />,
}));
vi.mock('../model/useProfileFrames', () => ({
  useProfileFrames: () => ({
    catalog: {
      data: state.error ? undefined : [item],
      isPending: false,
      isError: state.error,
      refetch: state.refetch,
    },
    inventory: {
      data: {
        activeProfileFrameId: state.active ? 'sky' : null,
        items: state.owned ? [{ profileFrame: item }] : [],
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
describe('ProfileFrame shop workflow', () => {
  it('restores URL search and clears it with focus restoration', async () => {
    renderWithProviders(<ProfileFrameShopSection />, {
      initialEntries: ['/shop?category=profileFrames&frame-search=missing'],
    });
    expect(screen.getByRole('status')).toHaveTextContent('не найдены');
    await userEvent.click(screen.getByRole('button', { name: 'Очистить поиск рамок' }));
    expect(screen.getByRole('button', { name: 'Открыть рамку Glowing Sky' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
  it('equips and removes through the server mutation', async () => {
    renderWithProviders(<ProfileFrameShopSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть рамку Glowing Sky' }));
    await userEvent.click(screen.getByRole('button', { name: 'Применить рамку' }));
    expect(state.mutate).toHaveBeenLastCalledWith('sky');
    state.active = true;
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть рамку' }));
    await userEvent.click(screen.getByRole('button', { name: 'Открыть рамку Glowing Sky' }));
    await userEvent.click(screen.getByRole('button', { name: 'Снять рамку' }));
    expect(state.mutate).toHaveBeenLastCalledWith(null);
  });
  it('does not expose a purchase or free claim for an unowned item', async () => {
    state.owned = false;
    renderWithProviders(<ProfileFrameShopSection />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть рамку Glowing Sky' }));
    expect(screen.getByRole('button', { name: 'Продажи пока закрыты' })).toBeDisabled();
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it('keeps the catalog error recoverable without invented fallback items', async () => {
    state.error = true;
    renderWithProviders(<ProfileFrameShopSection />);
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить');
    expect(screen.queryByRole('button', { name: /^Открыть/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Повторить$/ }));
    expect(state.refetch).toHaveBeenCalled();
  });
});
