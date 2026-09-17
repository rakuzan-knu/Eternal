import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LawEnforcementPage } from '../LawEnforcementPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('LawEnforcementPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and introduction', () => {
    render(
      <MemoryRouter>
        <LawEnforcementPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('GUIDELINES FOR LAW ENFORCEMENT')).toBeInTheDocument();
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Kyiv, Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 5 law enforcement sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <LawEnforcementPage />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByText('Legal Process Requirements & Authority').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Emergency Data Requests (Exigent Circumstances)').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Data Preservation Requests').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Technical & Cryptographic Limitations').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('User Notification & Contact Channel').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders E2EE limitations and legal service email', () => {
    render(
      <MemoryRouter>
        <LawEnforcementPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Zero-Knowledge & Ephemeral Storage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/legal@eternal\.app/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <LawEnforcementPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('КЕРІВНИЦТВО ДЛЯ ПРАВООХОРОННИХ ОРГАНІВ')).toBeInTheDocument();
    expect(
      screen.getAllByText('Вимоги до офіційних правових запитів').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
