import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopPage from '../ShopPage';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useWishlistStore } from '../model/useWishlistStore';

const mockDecorations = [
  {
    id: 'deco-1',
    slug: 'deco-1',
    name: 'Astral Sigil',
    description: 'Celestial halo',
    assetType: 'lottie',
    assetUrl: '/deco-1.json',
    previewUrl: '/deco-1.webp',
    rarity: 'epic',
    priceCents: 499,
    isAvailable: false,
  },
  {
    id: 'deco-2',
    slug: 'deco-2',
    name: 'Butterfly Waltz',
    description: 'Fluttering wings',
    assetType: 'lottie',
    assetUrl: '/deco-2.json',
    previewUrl: '/deco-2.webp',
    rarity: 'epic',
    priceCents: 699,
    isAvailable: false,
  },
];

vi.mock('@/widgets/sidebar/ui/RailwaySidebar', () => ({
  default: () => <nav aria-label="Navigation" />,
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'user-1',
      avatar: '/avatar.png',
      displayName: 'TestUser',
      username: 'testuser',
    },
  }),
}));

vi.mock('@/shared/ui/AvatarDecoration', () => ({
  AvatarWithDecoration: ({ decoration }: any) => (
    <div data-testid="avatar-with-decoration" data-decoration-name={decoration?.name}>
      <img alt="Аватар" src="/avatar.png" />
    </div>
  ),
}));

vi.mock('../model/useDecorations', () => ({
  useDecorations: () => ({
    catalog: {
      data: mockDecorations,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    },
    inventory: {
      data: {
        items: [],
        activeDecorationId: null,
      },
      isError: false,
    },
    equip: {
      mutate: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    },
  }),
}));

describe('Shop Wishlist Synchronization & Discord 1:1 Minimalist View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWishlistStore.getState().clearWishlist();
  });

  it('adds and removes items via store and reflects in wishlistIds', () => {
    const store = useWishlistStore.getState();
    expect(store.wishlistIds).toEqual([]);

    store.toggleWishlist('item-1', 'slug-1');
    expect(useWishlistStore.getState().wishlistIds).toContain('item-1');
    expect(useWishlistStore.getState().isWishlisted('item-1')).toBe(true);
    expect(useWishlistStore.getState().isWishlisted('item-1', 'slug-1')).toBe(true);

    store.toggleWishlist('item-1', 'slug-1');
    expect(useWishlistStore.getState().wishlistIds).toEqual([]);
    expect(useWishlistStore.getState().isWishlisted('item-1')).toBe(false);
  });

  it('synchronizes wishlist toggle instantly between card and navbar badge', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop'] });

    // Initial state: wishlist empty, navbar wishlist button has no badge
    const navbarWishlistBtn = screen.getByRole('button', { name: /^Wishlist$/i });
    expect(navbarWishlistBtn).toBeInTheDocument();
    expect(useWishlistStore.getState().wishlistIds.length).toBe(0);

    // Card should have Add to Wishlist button
    const cardButtons = screen.getAllByRole('button', { name: /Add to Wishlist/i });
    expect(cardButtons.length).toBeGreaterThan(0);

    // Click the first Add to Wishlist button
    await user.click(cardButtons[0]!);

    // Should immediately save to store
    expect(useWishlistStore.getState().wishlistIds.length).toBe(1);

    // Button label should update to Remove from Wishlist
    expect(screen.getByRole('button', { name: /Remove from Wishlist/i })).toBeInTheDocument();

    // Clicking it again removes the item
    const removeBtn = screen.getByRole('button', { name: /Remove from Wishlist/i });
    await user.click(removeBtn);
    expect(useWishlistStore.getState().wishlistIds.length).toBe(0);
  });

  it('switches smoothly to the Discord 1:1 Wishlist view and shows saved cards', async () => {
    const user = userEvent.setup();
    // Pre-populate wishlist with a featured item ID
    useWishlistStore.getState().addToWishlist('bundle-butterfly-waltz', 'bundle-butterfly-waltz');

    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=wishlist'] });

    // Header displays Wishlist title and count
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Wishlist (1)');

    // The saved item is rendered as a minimalist Discord 1:1 card with "View Details" button
    const detailsBtn = screen.getByRole('button', { name: 'View Details' });
    expect(detailsBtn).toBeInTheDocument();

    // Clicking "View Details" opens the ShopItemModal preview
    await user.click(detailsBtn);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Butterfly Waltz')).toBeInTheDocument();

    // Inside modal, the heart button is active/wishlisted
    const modalWishlistBtn = within(dialog).getByRole('button', { name: /Remove from Wishlist/i });
    expect(modalWishlistBtn).toBeInTheDocument();

    // Toggling inside modal updates store
    await user.click(modalWishlistBtn);
    expect(useWishlistStore.getState().wishlistIds.length).toBe(0);
  });

  it('displays a sleek Discord empty state when wishlist is cleared', async () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=wishlist'] });

    expect(screen.getByText(/Your Wishlist is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Shop/i })).toBeInTheDocument();
  });
});
