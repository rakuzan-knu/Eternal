import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/widgets/sidebar/ui/Sidebar', () => ({
  default: () => <nav aria-label="Application sidebar" />,
}));

describe('Public Pages Routing Integration', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it.each([false, true])(
    'renders /creators without the application sidebar (authenticated: %s)',
    async (isAuthenticated) => {
      useAuthStore.setState({ isAuthenticated, userId: isAuthenticated ? 'user-123' : null });
      renderWithProviders(<App />, { initialEntries: ['/creators'] });

      const heading = await screen.findByRole(
        'heading',
        { level: 1, name: /WELCOME CREATORS/i },
        { timeout: 5000 },
      );
      expect(heading).toBeInTheDocument();
      expect(
        screen.queryByRole('navigation', { name: 'Application sidebar' }),
      ).not.toBeInTheDocument();
      if (isAuthenticated) {
        expect(heading.closest('main')).not.toHaveClass('pl-24');
        expect(heading.closest('main')).not.toHaveClass('pl-72');
      }
    },
  );

  it('is publicly accessible directly via /blog without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/blog'] });

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { level: 1, name: /ETERNAL BLOG/i }),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('is publicly accessible directly via /category/community without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/category/community'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /COMMUNITY/i })).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/company without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/category/company'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /ETERNAL HQ/i })).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/engineering without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/category/engineering'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /ENGINEERING & DEVELOPERS/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/how-to-eternal without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/category/how-to-eternal'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /HOW TO ETERNAL/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/safety without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/category/safety'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /POLICY & SAFETY/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/product without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/category/product'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /PRODUCT & FEATURES/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /branding without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/branding'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /BRAND ASSETS/i })).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /download without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/download'] });

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', {
            level: 1,
            name: /ETERNAL IN YOUR BROWSER/i,
          }),
        ).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  });

  it('is publicly accessible directly via /newsroom without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/newsroom'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /PRESS CENTER/i })).toBeInTheDocument();
    });
  });
});
