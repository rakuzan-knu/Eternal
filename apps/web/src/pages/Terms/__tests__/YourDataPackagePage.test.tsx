import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { YourDataPackagePage } from '../YourDataPackagePage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('YourDataPackagePage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and What this article covers box', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Your Eternal Data Package')).toBeInTheDocument();
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
    expect(screen.getByText('What this article covers:')).toBeInTheDocument();
  });

  it('renders visual guide and interactive settings modal preview', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Interactive Settings Preview')).toBeInTheDocument();
    expect(screen.getAllByText('Request All of My Data').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Profile Privacy').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 5 main sections in TOC and article', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('What Is A Data Package?').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How To Request A Data Package').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('What Information Is Inside A Data Package?').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Compilation Timelines & Link Expiration').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Legal Rights & Data Protection Officer').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders DPO contact information with Kyiv, Ukraine address', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/dpo@eternal\.app/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/privacy@eternal\.app/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kyiv, Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ваш пакет даних Eternal')).toBeInTheDocument();
    expect(screen.getByText(/Набуття чинності: 1 вересня 2026 р./i)).toBeInTheDocument();
    expect(screen.getAllByText('Що таке пакет даних?').length).toBeGreaterThanOrEqual(1);
  });
});
