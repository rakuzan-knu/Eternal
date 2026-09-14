import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CategoryPage } from '../CategoryPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import App from '../../../app/App';
import { renderWithProviders } from '../../../test/renderWithProviders';

describe('Category Page (/category/community)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it('renders COMMUNITY hero header, subtitle, and toolkit hero card', () => {
    render(
      <MemoryRouter initialEntries={['/category/community']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /COMMUNITY/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Stories, spotlights, and behind the scenes from the heart and soul of Eternal: the community/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /INTRODUCING THE COMMUNITY MODERATION & CREATOR TOOLKIT REPORT/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders Featured and Explore Further community articles', () => {
    render(
      <MemoryRouter initialEntries={['/category/community']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Featured articles
    expect(
      screen.getByText(/Creator Hubs & Verified Badges: Empowering Independent Voices/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Celebrating Digital Artists: Eternal Creative Stage & Live Jam Nights/i),
    ).toBeInTheDocument();

    // Explore Further
    expect(
      screen.getByText(/Global Mod Summit: Safer Digital Spaces & Proactive Mod Tools/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Gamers & Esports Guilds: Low-Latency Screen Broadcasts & Voice Lounges/i),
    ).toBeInTheDocument();
  });

  it('filters community articles dynamically by search query', () => {
    render(
      <MemoryRouter initialEntries={['/category/community']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText(/Search.../i);
    fireEvent.change(searchInput, { target: { value: 'Grants' } });

    expect(
      screen.getByText(/Eternal Creator Grants 2026: Funding Independent Communities/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Gamers & Esports Guilds/i)).not.toBeInTheDocument();
  });

  it('switches to Ukrainian dynamically and updates headings', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter initialEntries={['/category/community']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /СПІЛЬНОТА/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /ЗВІТ ПРО ІНСТРУМЕНТИ МОДЕРАЦІЇ ТА ПІДТРИМКИ АВТОРІВ СПІЛЬНОТИ/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders ETERNAL HQ company page at /category/company with dedicated articles', () => {
    render(
      <MemoryRouter initialEntries={['/category/company']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /ETERNAL HQ/i })).toBeInTheDocument();
    expect(
      screen.getByText(/General company updates about what Eternal is up to at HQ/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /SCALING THE SOCIAL FRONTIER: ETERNAL BACKS NEXT-GEN INDIE CREATORS & DEVELOPERS/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Celebrate Eternal's Milestone with Exclusive Brand Stickers/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Behind the Brand: Designing the Eternal Design System 2.0/i),
    ).toBeInTheDocument();
  });

  it('renders ENGINEERING & DEVELOPERS page at /category/engineering with dedicated articles', () => {
    render(
      <MemoryRouter initialEntries={['/category/engineering']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /ENGINEERING & DEVELOPERS/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Resources and news for engineers and Eternal app developers/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /GENERAL AVAILABILITY OF CROSS-PLATFORM CLIENT SUPPORT IN ETERNAL SOCIAL SDK V2.0/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Building High-Throughput Real-Time Sync with Rust, Tokio, and WebSockets/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Verified App Developer Program: Build, Monetize, and Scale on Eternal/i),
    ).toBeInTheDocument();
  });

  it('renders HOW TO ETERNAL page at /category/how-to-eternal with dedicated guides', () => {
    render(
      <MemoryRouter initialEntries={['/category/how-to-eternal']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /HOW TO ETERNAL/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Tutorials and guides to help with Eternal and other topics of interest/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /HOW TO MANAGE YOUR ETERNAL DESKTOP NOTIFICATIONS & PRIVACY: A COMPLETE GUIDE/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/How to Customize Themes and Chat Backgrounds: A Complete Styling Guide/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Making Eternal on Desktop Look Just Right: Display Settings to Ease the Eyes/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders POLICY & SAFETY page at /category/safety with dedicated safety posts', () => {
    render(
      <MemoryRouter initialEntries={['/category/safety']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /POLICY & SAFETY/i })).toBeInTheDocument();
    expect(
      screen.getByText(/General tips and insights from Eternal’s Policy & Safety teams/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /HOW ETERNAL DEFENSE SHIELD IS ADVANCING ONLINE TRUST & SAFETY/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Getting Global Age Assurance Right: What We Learned and What’s Changing/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Eternal Announces “Guardian” and “Sentinel”: Free, Open-Source Safety Infrastructure/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders PRODUCT & FEATURES page at /category/product with dedicated product updates', () => {
    render(
      <MemoryRouter initialEntries={['/category/product']}>
        <Routes>
          <Route path="/category/:categoryId" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /PRODUCT & FEATURES/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Announcements, new features, and general info about the Eternal app/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /LINK ETERNAL AND YOUR FAVORITE GAMES TO KEEP THE GUILD CHATTING WHEREVER YOU ARE/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Eternal Update: August 2026 Changelog & Major Feature Drop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Meet Eternal Assistant: Context-Aware Summaries, Smart Search & Voice Notes/i,
      ),
    ).toBeInTheDocument();
  });

  it('is publicly accessible directly via /category/community without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/category/community'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /COMMUNITY/i })).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/company without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/category/company'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /ETERNAL HQ/i })).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/engineering without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/category/engineering'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /ENGINEERING & DEVELOPERS/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/how-to-eternal without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/category/how-to-eternal'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /HOW TO ETERNAL/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/safety without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/category/safety'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /POLICY & SAFETY/i }),
      ).toBeInTheDocument();
    });
  });

  it('is publicly accessible directly via /category/product without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/category/product'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /PRODUCT & FEATURES/i }),
      ).toBeInTheDocument();
    });
  });
});
