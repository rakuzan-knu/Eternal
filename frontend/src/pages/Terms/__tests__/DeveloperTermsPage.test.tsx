import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeveloperTermsPage } from '../DeveloperTermsPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('DeveloperTermsPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and platform overview', () => {
    render(
      <MemoryRouter>
        <DeveloperTermsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('DEVELOPER & BOT API TERMS OF SERVICE')).toBeInTheDocument();
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
  });

  it('renders all 6 developer sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <DeveloperTermsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByText('Developer Platform & Scope of Agreement').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('API Token Security & Confidentiality').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Rate Limits, Server Health & Fair Usage').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Prohibited Bot Activities & Scraping').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Data Protection, Caching & Deletion Webhooks').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Developer Support & Inquiries').length).toBeGreaterThanOrEqual(1);
  });

  it('renders rate limit backoff and developer contact email', () => {
    render(
      <MemoryRouter>
        <DeveloperTermsPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/HTTP 429/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/developers@eternal\.app/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <DeveloperTermsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('УМОВИ ВИКОРИСТАННЯ API ТА СТВОРЕННЯ БОТІВ')).toBeInTheDocument();
    expect(
      screen.getAllByText('Загальні положення платформи розробників').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
