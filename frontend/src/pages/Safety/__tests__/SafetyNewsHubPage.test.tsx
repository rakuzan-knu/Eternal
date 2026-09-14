import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SafetyNewsHubPage } from '../SafetyNewsHubPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('SafetyNewsHubPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, subtitle, and featured hero article', () => {
    render(
      <MemoryRouter>
        <SafetyNewsHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ETERNAL SAFETY NEWS HUB')).toBeInTheDocument();
    expect(
      screen.getByText(
        "The latest news and updates on Eternal's Safety, Privacy, and Policy initiatives.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "A BETTER INTERNET STARTS WITH EDUCATION: INTRODUCING THE ETERNAL PLAYER'S GUIDE AND WELLBEING PRINCIPLES",
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders category and topic filter buttons and search input', () => {
    render(
      <MemoryRouter>
        <SafetyNewsHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('View All')).toBeInTheDocument();
    expect(screen.getByText('Pick a Topic')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search articles...')).toBeInTheDocument();
  });

  it('filters articles by search input', () => {
    render(
      <MemoryRouter>
        <SafetyNewsHubPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search articles...');
    fireEvent.change(searchInput, { target: { value: 'Cryptography' } });

    expect(
      screen.getByText('Transparency in Security: Upgrading End-to-End Cryptography Protocols'),
    ).toBeInTheDocument();
  });

  it('filters articles by search query for specific topics', () => {
    render(
      <MemoryRouter>
        <SafetyNewsHubPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search articles...');
    fireEvent.change(searchInput, { target: { value: 'Partners' } });

    expect(
      screen.getByText(
        'Better Communities Start With Us: Eternal Partners with International Safety Coalitions',
      ),
    ).toBeInTheDocument();
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <SafetyNewsHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ХАБ НОВИН БЕЗПЕКИ ETERNAL')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'КРАЩИЙ ІНТЕРНЕТ ПОЧИНАЄТЬСЯ З ОСВІТИ: ПРЕДСТАВЛЯЄМО ПОСІБНИК ГРАВЦЯ ТА ПРИНЦИПИ ДОБРОБУТУ ETERNAL',
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('Пошук статей...')).toBeInTheDocument();
  });
});
