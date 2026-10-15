import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShopPage from '../ShopPage';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/widgets/sidebar/ui/RailwaySidebar', () => ({
  default: () => <nav aria-label="Navigation" />,
}));
vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { avatar: '/avatar.png', displayName: 'TestUser' } }),
}));
vi.mock('@/shared/ui/AvatarDecoration', () => ({
  AvatarWithDecoration: ({ decoration }: any) => (
    <div data-testid="avatar-with-decoration" data-decoration-name={decoration?.name}>
      <img alt="Avatar" src="/avatar.png" />
    </div>
  ),
}));

describe('Shop Browse view with Discord layout and filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders avatar decorations with Discord header and 16 items per page', () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=avatars'] });
    // Check header title has ~110 decorations
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Avatar Decorations \(\d+\)/,
    );
    // Verify there are 16 cards on the first page
    const cards = screen.getAllByRole('button', { name: /^Open/ });
    expect(cards.length).toBe(16);

    // Verify Discord pagination is rendered
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('displays the Discord-styled filter sidebar with Show only, Colors (no brown), and Themes', () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=avatars'] });
    // "Show only" section inside sidebar
    const sidebar = screen.getByRole('complementary', { name: 'Catalog filters' });
    expect(within(sidebar).getByText('Show only')).toBeInTheDocument();
    expect(within(sidebar).getByText('Nameplates')).toBeInTheDocument();
    expect(within(sidebar).getByText('Profile Effects')).toBeInTheDocument();
    expect(within(sidebar).getByText('Profile Frames')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Collabs')).toBeNull();

    // "Color" section: verify NO brown color option exists
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Color Brown/i)).toBeNull();
    expect(screen.getByLabelText(/Color Purple/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Blue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Green/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Yellow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Orange/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Red/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Pink/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color White/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color Black/i)).toBeInTheDocument();

    // "Themes" section
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anime' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gaming' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cute & Cozy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sci-Fi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fantasy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark & Moody' })).toBeInTheDocument();
  });

  it('toggles the filter sidebar via Hide Filters / Show Filters button', async () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=avatars'] });
    const toggleBtn = screen.getByRole('button', { name: /Hide Filters/i });
    expect(toggleBtn).toBeInTheDocument();

    // Click Hide Filters
    await userEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Show Filters/i })).toBeInTheDocument();

    // Click Show Filters to bring it back
    await userEvent.click(screen.getByRole('button', { name: /Show Filters/i }));
    expect(screen.getByRole('button', { name: /Hide Filters/i })).toBeInTheDocument();
  });

  it('filters by Theme and highlights the selected theme button in purple', async () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=avatars'] });
    const animeBtn = screen.getByRole('button', { name: 'Anime' });
    await userEvent.click(animeBtn);

    // Button should be active (aria-pressed="true" and bg-[#8b5cf6])
    expect(animeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(animeBtn.className).toContain('bg-[#8b5cf6]');

    // Clear all filters resets the theme
    const clearBtn = screen.getByRole('button', { name: /Clear all filters/i });
    await userEvent.click(clearBtn);
    expect(animeBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to Profile Frames and displays frames with correct count', () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=profile-frames'] });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Profile Frames \(14\)/);
  });

  it('navigates between pages using Discord pagination', async () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=avatars'] });

    const prevBtn = screen.getByRole('button', { name: /Previous/i });
    const nextBtn = screen.getByRole('button', { name: /Next/i });

    // Page 1 is active, Previous is disabled
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Navigate to next page
    await userEvent.click(nextBtn);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(prevBtn).not.toBeDisabled();
  });

  it('clears all filters and displays all products', async () => {
    renderWithProviders(<ShopPage />, { initialEntries: ['/shop?category=avatars'] });

    const clearBtn = screen.getByRole('button', { name: /Clear all filters/i });
    expect(clearBtn).not.toBeDisabled();

    await userEvent.click(clearBtn);

    // Title shows All Products with total items count
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/All Products \(\d+\)/);

    // Clear all filters is now disabled since no filters are active
    expect(clearBtn).toBeDisabled();
  });
});
