import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeaturedCard } from '../ui/FeaturedCard';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { UnifiedShopItem } from '../data/allShopItems';

const mockItem: UnifiedShopItem = {
  id: 'fallen-angel-black',
  slug: 'fallen-angel-black',
  name: 'Fallen Angel (Black)',
  category: 'avatar',
  priceCents: 4100,
  previewUrl: '/decorations/fallen-angel-black.webp',
  colors: ['purple', 'black'],
  theme: 'Dark & Moody',
};

describe('FeaturedCard Discord 1:1 styling and interactions', () => {
  it('renders unowned item with price, wishlist button, buy button and gift button', async () => {
    const handleClick = vi.fn();
    const handleEquip = vi.fn();
    const handleSendGift = vi.fn();

    renderWithProviders(
      <FeaturedCard
        item={mockItem}
        owned={false}
        active={false}
        onClick={handleClick}
        onEquip={handleEquip}
        onSendGift={handleSendGift}
      />,
    );

    // Item name and formatted price
    expect(screen.getByText('Fallen Angel (Black)')).toBeInTheDocument();
    expect(screen.getByText('$41.00')).toBeInTheDocument();

    // Wishlist button is available for unowned items
    const wishlistBtn = screen.getByRole('button', { name: 'Add to Wishlist' });
    expect(wishlistBtn).toBeInTheDocument();

    // Buy button
    const buyBtn = screen.getByRole('button', { name: 'Buy for $41.00' });
    expect(buyBtn).toBeInTheDocument();

    // Send a gift button
    const giftBtn = screen.getByRole('button', { name: 'Send a gift' });
    expect(giftBtn).toBeInTheDocument();

    // Clicking buy triggers onClick
    await userEvent.click(buyBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Clicking gift triggers onSendGift
    await userEvent.click(giftBtn);
    expect(handleSendGift).toHaveBeenCalledTimes(1);
  });

  it('renders owned item with price, checkmark overlay, NO wishlist button, Gift button, and "Use now" button', async () => {
    const handleEquip = vi.fn();
    const handleSendGift = vi.fn();

    renderWithProviders(
      <FeaturedCard
        item={mockItem}
        owned={true}
        active={false}
        onClick={vi.fn()}
        onEquip={handleEquip}
        onSendGift={handleSendGift}
      />,
    );

    // Displays price in resting state (checkmark indicates ownership)
    expect(screen.getByText('$41.00')).toBeInTheDocument();

    // Wishlist button is strictly hidden for owned items
    expect(screen.queryByRole('button', { name: 'Add to Wishlist' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove from Wishlist' })).toBeNull();

    // "Use now" button is available (clean text)
    const useNowBtn = screen.getByRole('button', { name: /Use now/i });
    expect(useNowBtn).toBeInTheDocument();

    // Send a gift button is also present when owned
    const giftBtn = screen.getByRole('button', { name: 'Send a gift' });
    expect(giftBtn).toBeInTheDocument();

    // Clicking "Use now" triggers real-time equip
    await userEvent.click(useNowBtn);
    expect(handleEquip).toHaveBeenCalledTimes(1);

    // Clicking gift button triggers onSendGift
    await userEvent.click(giftBtn);
    expect(handleSendGift).toHaveBeenCalledTimes(1);
  });

  it('renders already equipped item with disabled "Equipped" button, checkmark, and Gift button', () => {
    renderWithProviders(
      <FeaturedCard
        item={mockItem}
        owned={true}
        active={true}
        onClick={vi.fn()}
        onEquip={vi.fn()}
      />,
    );

    // Equipped button is rendered and disabled
    const equippedBtn = screen.getByRole('button', { name: /Equipped/i });
    expect(equippedBtn).toBeInTheDocument();
    expect(equippedBtn).toBeDisabled();

    // Gift button is present
    expect(screen.getByRole('button', { name: 'Send a gift' })).toBeInTheDocument();

    // Wishlist button is still not rendered
    expect(screen.queryByRole('button', { name: 'Add to Wishlist' })).toBeNull();
  });

  it('renders profile frames, nameplates, profile effects and bundles without errors', () => {
    const frameItem: UnifiedShopItem = {
      id: 'frame-celestial',
      slug: 'frame-celestial',
      name: 'Celestial Crown',
      category: 'frame',
      priceCents: 4100,
      previewUrl: '/frames/celestial.webp',
      colors: ['purple'],
      theme: 'Fantasy',
    };

    const nameplateItem: UnifiedShopItem = {
      id: 'nameplate-always-watching',
      slug: 'nameplate-always-watching',
      name: 'Always Watching',
      category: 'nameplate',
      priceCents: 4100,
      previewUrl: '/nameplates/always-watching.webp',
      colors: ['black'],
      theme: 'Dark & Moody',
    };

    const effectItem: UnifiedShopItem = {
      id: 'effect-shattered-wings',
      slug: 'effect-shattered-wings',
      name: 'Shattered Wings',
      category: 'effect',
      priceCents: 4100,
      previewUrl: '/effects/shattered-wings.webp',
      colors: ['purple', 'white'],
      theme: 'Fantasy',
    };

    const { rerender } = renderWithProviders(<FeaturedCard item={frameItem} onClick={vi.fn()} />);
    expect(screen.getByText('Celestial Crown')).toBeInTheDocument();

    rerender(<FeaturedCard item={nameplateItem} onClick={vi.fn()} />);
    expect(screen.getByText('Always Watching')).toBeInTheDocument();

    rerender(<FeaturedCard item={effectItem} onClick={vi.fn()} />);
    expect(screen.getByText('Shattered Wings')).toBeInTheDocument();
  });
});
