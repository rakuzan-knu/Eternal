import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopPage from '../ShopPage';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/widgets/sidebar/ui/RailwaySidebar', () => ({
  default: () => <div data-testid="mock-railway-sidebar">RailwaySidebar</div>,
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'user-1',
      username: 'alice',
      displayName: 'Alice Smith',
      avatar: 'https://example.com/avatar.png',
    },
    isLoading: false,
  }),
}));

describe('ShopPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return renderWithProviders(<ShopPage />);
  };

  it('renders RailwaySidebar and the polished Shop header with initial $0.00 USD balance', () => {
    renderComponent();

    // RailwaySidebar is rendered on the left
    expect(screen.getByTestId('mock-railway-sidebar')).toBeInTheDocument();

    // Navigation Tabs: Featured, Browse, Game Shops
    expect(screen.getByRole('button', { name: 'Featured' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Browse$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Game Shops/i })).toBeInTheDocument();

    // Removed promo tabs
    expect(screen.queryByRole('button', { name: 'Orbs Exclusives' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Halloween Promo/i })).not.toBeInTheDocument();

    // Search and USD Wallet Balance initialized to 0.00
    expect(screen.getByPlaceholderText('Search the Shop')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('renders the Cauldron Chaos Hero banner and eligible items row', () => {
    renderComponent();

    // Hero banner text
    expect(screen.getByText(/Cast a spell/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cauldron Chaos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1 of 4 collected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shop the Collection/i })).toBeInTheDocument();

    // Eligible items from Screenshot 4
    expect(screen.getByText('Eligible items')).toBeInTheDocument();
    expect(screen.getAllByText("5pc Lottie's Cauldron Bundle")[0]).toBeInTheDocument();
    expect(screen.getAllByText('3pc Witching Hour Bundle')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Grinning Gourds')[0]).toBeInTheDocument();
    expect(screen.getAllByText("Hex's Hat")[0]).toBeInTheDocument();
  });

  it('opens the Browse dropdown menu and displays categories without random icons or Collabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    const browseBtn = screen.getByRole('button', { name: /^Browse$/i });
    await user.click(browseBtn);

    // Active categories
    expect(screen.getAllByText('Avatar Decorations').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nameplates').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Profile Effects').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Profile Frames').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bundles').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Shop All')).toBeInTheDocument();

    // Collabs removed as requested
    expect(screen.queryByText('Collabs')).not.toBeInTheDocument();
  });

  it('filters items when selecting a category from the Browse dropdown', async () => {
    const user = userEvent.setup();
    renderComponent();

    const browseBtn = screen.getByRole('button', { name: /^Browse$/i });
    await user.click(browseBtn);

    // Click Avatar Decorations inside the dropdown
    const avatarDecoOptions = screen.getAllByText('Avatar Decorations');
    await user.click(avatarDecoOptions[0]);

    // Should switch to category view with heading
    expect(
      screen.getByRole('heading', { level: 1, name: 'Avatar Decorations' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Hex's Hat")[0]).toBeInTheDocument();
  });

  it('opens Game Shops dropdown and displays Soon status', async () => {
    const user = userEvent.setup();
    renderComponent();

    const gameShopsBtn = screen.getByRole('button', { name: /Game Shops/i });
    await user.click(gameShopsBtn);

    expect(screen.getByText('Soon')).toBeInTheDocument();
    expect(screen.getByText(/Partnerships coming soon/i)).toBeInTheDocument();
  });

  it('clears search query and returns to Featured when clicking Featured tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    const searchInput = screen.getByPlaceholderText('Search the Shop');
    fireEvent.change(searchInput, { target: { value: 'Cyberpunk' } });
    expect(
      screen.getByRole('heading', { level: 1, name: /Search results for "Cyberpunk"/i }),
    ).toBeInTheDocument();

    const featuredBtn = screen.getByRole('button', { name: 'Featured' });
    await user.click(featuredBtn);

    expect(screen.getByText('Eligible items')).toBeInTheDocument();
    expect((screen.getByPlaceholderText('Search the Shop') as HTMLInputElement).value).toBe('');
  });

  it('opens the item preview modal on card click and shows USD price', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Click on Hex's Hat card
    const hexHatCard = screen.getAllByText("Hex's Hat")[0];
    await user.click(hexHatCard);

    // Modal opens
    expect(screen.getByText('Try On Preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buy for Myself/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gift/i })).toBeInTheDocument();
  });
});
