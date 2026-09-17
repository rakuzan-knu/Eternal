import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreatorsPage } from '../CreatorsPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

// Mock auth store
vi.mock('../../../shared/model/useAuthStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      isAuthenticated: false,
      user: null,
    }),
}));

describe('CreatorsPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders Hero section with Welcome Creators title', () => {
    render(
      <MemoryRouter>
        <CreatorsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/WELCOME CREATORS/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Learn how to grow your community and make the most of your Eternal server./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders Featured Guides', () => {
    render(
      <MemoryRouter>
        <CreatorsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Creator to Server Admin 101/i)).toBeInTheDocument();
    expect(screen.getByText(/Creator to Server Admin 201/i)).toBeInTheDocument();
  });

  it('filters articles when clicking category pills', () => {
    render(
      <MemoryRouter>
        <CreatorsPage />
      </MemoryRouter>,
    );

    const monetizationBtn = screen.getByRole('button', { name: /^Monetization$/i });
    fireEvent.click(monetizationBtn);

    expect(screen.getByText(/Server Subscriptions & Monetization/i)).toBeInTheDocument();
  });

  it('opens and closes interactive guide detail modal', () => {
    render(
      <MemoryRouter>
        <CreatorsPage />
      </MemoryRouter>,
    );

    const card = screen.getByText(/Creator to Server Admin 101/i);
    fireEvent.click(card);

    expect(screen.getByText(/Key Takeaways/i)).toBeInTheDocument();
    expect(screen.getByText(/Actionable Steps/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Actionable Steps/i)).not.toBeInTheDocument();
  });

  it('supports Ukrainian language', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <CreatorsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/ВІТАЄМО, КРІЕЙТОРИ!/i)).toBeInTheDocument();
    expect(screen.getByText(/Від кріейтора до адміна сервера 101/i)).toBeInTheDocument();
  });
});
