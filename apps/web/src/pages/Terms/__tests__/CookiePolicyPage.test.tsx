import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CookiePolicyPage } from '../CookiePolicyPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('CookiePolicyPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and introduction', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('COOKIE POLICY')).toBeInTheDocument();
    expect(screen.getByText(/Updated: November 5, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/We may receive information from cookies/i)).toBeInTheDocument();
  });

  it('renders all 3 sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Types of Cookies We Use').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How to Manage Cookies').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Questions and Contact Information').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('renders cookie categories (Strictly Necessary, Functional, Performance)', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Strictly Necessary Cookies:/i)).toBeInTheDocument();
    expect(screen.getByText(/Functional Cookies:/i)).toBeInTheDocument();
    expect(screen.getByText(/Performance & Analytics Cookies:/i)).toBeInTheDocument();
  });

  it('renders contact details with country and missing contact and emails', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/eternalnet\.support@proton\.me/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ПОЛІТИКА ВИКОРИСТАННЯ ФАЙЛІВ COOKIE')).toBeInTheDocument();
    expect(
      screen.getAllByText('Типи файлів Cookie, які ми використовуємо').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
