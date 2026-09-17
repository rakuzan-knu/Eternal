import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { renderWithProviders } from '@/test/renderWithProviders';

describe('Public Pages Routing Integration', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it('is publicly accessible directly via /blog without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/blog'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /ETERNAL BLOG/i })).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /DOWNLOAD ETERNAL WHEREVER YOU HANG OUT/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /newsroom without requiring login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/newsroom'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /PRESS CENTER/i })).toBeInTheDocument();
    });
  });
});
