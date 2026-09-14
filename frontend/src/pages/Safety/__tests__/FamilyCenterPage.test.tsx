import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FamilyCenterPage } from '../FamilyCenterPage';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useUIStore } from '../../../shared/model/useUIStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderWithProviders(ui: React.ReactElement, initialRoute = '/safety-family-center') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/safety-family-center" element={ui} />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route path="/" element={<div data-testid="feed-page">Home Feed</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FamilyCenterPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });
    useLanguageStore.setState({ currentLanguage: 'English' });
    useUIStore.setState({ isEditProfileOpen: false, editProfileInitialTab: 'account' });
    vi.clearAllMocks();
  });

  it('renders hero title, subtitle, and CTA buttons in English', () => {
    renderWithProviders(<FamilyCenterPage />);

    expect(screen.getByRole('heading', { name: /ETERNAL FAMILY CENTER/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Learn more about what we’re doing to help your teen stay safer/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open Family Center/i }).length).toBeGreaterThan(
      0,
    );
  });

  it('renders For Parents and Guardians section and quote banner', () => {
    renderWithProviders(<FamilyCenterPage />);

    expect(screen.getByRole('heading', { name: /FOR PARENTS AND GUARDIANS/i })).toBeInTheDocument();
    expect(screen.getByText(/Larry Magid/i)).toBeInTheDocument();
    expect(screen.getByText(/CEO ConnectSafely.org/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /FOR TEENS/i })).toBeInTheDocument();
  });

  it('renders Eternal Approach to Safety and FAQs', () => {
    renderWithProviders(<FamilyCenterPage />);

    expect(
      screen.getByRole('heading', { name: /ETERNAL’S APPROACH TO SAFETY/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Community Guidelines/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Safety Controls/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /FREQUENTLY ASKED QUESTIONS/i }),
    ).toBeInTheDocument();
  });

  it('toggles FAQ accordions and switches between Parents and Teens tabs', () => {
    renderWithProviders(<FamilyCenterPage />);

    // Default tab is Parents
    expect(screen.getByText(/How do I set up Family Center with my teen\?/i)).toBeInTheDocument();

    // Click Teens tab
    const teensTab = screen.getByRole('button', { name: /For Teens/i });
    fireEvent.click(teensTab);

    expect(
      screen.getByText(/Can my parent read my private DMs or listen in on calls\?/i),
    ).toBeInTheDocument();

    // Toggle Teen FAQ accordion
    const teenFaqBtn = screen.getByRole('button', {
      name: /Can my parent read my private DMs or listen in on calls\?/i,
    });
    fireEvent.click(teenFaqBtn);
    expect(
      screen.getByText(/Family Center never gives parents access to your message text/i),
    ).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated user clicks Open Family Center', () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderWithProviders(<FamilyCenterPage />);

    const ctaButtons = screen.getAllByRole('button', { name: /Open Family Center/i });
    fireEvent.click(ctaButtons[0]);

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('opens EditProfileModal and navigates home when authenticated user clicks Open Family Center', () => {
    useAuthStore.setState({ isAuthenticated: true, userId: 'user-123' });
    const openEditProfileSpy = vi.spyOn(useUIStore.getState(), 'openEditProfile');

    renderWithProviders(<FamilyCenterPage />);

    const ctaButtons = screen.getAllByRole('button', { name: /Open Family Center/i });
    fireEvent.click(ctaButtons[0]);

    expect(openEditProfileSpy).toHaveBeenCalledWith('sec-family');
    expect(screen.getByTestId('feed-page')).toBeInTheDocument();
  });

  it('renders Ukrainian translations when language is set to Ukrainian', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    renderWithProviders(<FamilyCenterPage />);

    expect(screen.getByRole('heading', { name: /СІМЕЙНИЙ ЦЕНТР ETERNAL/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ДЛЯ БАТЬКІВ ТА ОПІКУНІВ/i })).toBeInTheDocument();
    expect(screen.getByText(/Ларрі Мегід/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ДЛЯ ПІДЛІТКІВ/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ПІДХІД ETERNAL ДО БЕЗПЕКИ/i })).toBeInTheDocument();
  });
});
