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
    expect(screen.getByText(/Updated November 5, 2026/i)).toBeInTheDocument();
    expect(screen.getByText('What this article covers:')).toBeInTheDocument();
  });

  it('renders visual guide and interactive settings modal preview', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Sign in to Eternal' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.queryByText('Request Submitted!')).not.toBeInTheDocument();
  });

  it('renders all 5 main sections in TOC and article', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('What Is A Data Package?').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How To Download Your Data').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Included Data and Exclusions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Download Limits and Errors').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Your Rights and Contact').length).toBeGreaterThanOrEqual(1);
  });

  it('renders DPO contact information with Ukraine address', () => {
    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/eternalnet\.support@proton\.me/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <YourDataPackagePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ваш пакет даних Eternal')).toBeInTheDocument();
    expect(screen.getByText(/Оновлено 5 листопада 2026 р./i)).toBeInTheDocument();
    expect(screen.getAllByText('Що таке пакет даних?').length).toBeGreaterThanOrEqual(1);
  });
});
