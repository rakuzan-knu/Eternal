import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopPage from '../ShopPage';
import { renderWithProviders } from '@/test/renderWithProviders';

const state = vi.hoisted(() => ({
  owned: false,
  active: false,
  error: false,
  mutate: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
  frames: ['astral-sigil', 'obsidian-crown', 'ronin-orbit'].map((id, i) => ({
    id,
    slug: id,
    name: ['Astral Sigil', 'Obsidian Crown', 'Ronin Orbit'][i],
    description: 'Custom frame',
    assetType: 'lottie',
    assetUrl: '/' + id + '.json',
    previewUrl: '/' + id + '.webp',
    rarity: 'epic',
    priceCents: 199,
    isAvailable: false,
  })),
}));
vi.mock('@/widgets/sidebar/ui/RailwaySidebar', () => ({
  default: () => <nav aria-label="Navigation" />,
}));
vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { avatar: '/avatar.png' } }),
}));
vi.mock('@/shared/ui/AvatarDecoration', () => ({
  AvatarWithDecoration: () => <img alt="Аватар" src="/avatar.png" />,
}));
vi.mock('../model/useDecorations', () => ({
  useDecorations: () => ({
    catalog: {
      data: state.error ? undefined : state.frames,
      isPending: false,
      isError: state.error,
      refetch: state.refetch,
    },
    inventory: {
      data: {
        items: state.owned ? [{ decoration: state.frames[0] }] : [],
        activeDecorationId: state.active ? state.frames[0].id : null,
      },
      isError: false,
    },
    equip: { mutate: state.mutate, reset: state.reset, isPending: false, isError: false },
  }),
}));
describe('Real decoration catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.owned = false;
    state.active = false;
    state.error = false;
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
  });
  it('shows three paid server items and removes the free showcase and mock catalog', () => {
    renderWithProviders(<ShopPage />);
    expect(screen.getAllByRole('button', { name: /^Открыть/ })).toHaveLength(3);
    expect(screen.getAllByText('$1.99')).toHaveLength(3);
    expect(screen.queryByText('Cyber Neon Pulse')).toBeNull();
    expect(screen.queryByText('Avatar Atelier')).toBeNull();
    expect(screen.queryByText('Eligible items')).toBeNull();
    expect(screen.queryByText('Grinning Gourds')).toBeNull();
  });
  it('never substitutes mock items when the catalog fails', () => {
    state.error = true;
    renderWithProviders(<ShopPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить');
    expect(screen.queryByRole('button', { name: /^Открыть/ })).toBeNull();
  });
  it('filters only actual frames', async () => {
    renderWithProviders(<ShopPage />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Поиск рамок' }), 'Ronin');
    expect(screen.getAllByRole('button', { name: /^Открыть/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Открыть Ronin Orbit' })).toBeInTheDocument();
  });
  it('disables receipt and purchase for an unowned frame', async () => {
    renderWithProviders(<ShopPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть Astral Sigil' }));
    expect(screen.getByRole('button', { name: 'Продажи пока закрыты' })).toBeDisabled();
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it('saves an owned selection through the server equip mutation', async () => {
    state.owned = true;
    renderWithProviders(<ShopPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть Astral Sigil' }));
    await userEvent.click(screen.getByRole('button', { name: 'Применить рамку' }));
    expect(state.mutate).toHaveBeenCalledWith('astral-sigil');
  });
  it('removes the equipped frame without affecting inventory', async () => {
    state.owned = true;
    state.active = true;
    renderWithProviders(<ShopPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть Astral Sigil' }));
    await userEvent.click(screen.getByRole('button', { name: 'Снять рамку' }));
    expect(state.mutate).toHaveBeenCalledWith(null);
  });
});
