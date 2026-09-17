import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CopyrightPolicyPage } from '../CopyrightPolicyPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('CopyrightPolicyPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and safe harbor overview', () => {
    render(
      <MemoryRouter>
        <CopyrightPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('DMCA & COPYRIGHT POLICY')).toBeInTheDocument();
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Designated Copyright Agent/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 6 copyright policy sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <CopyrightPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Overview & Safe Harbor Commitment').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText('Designated Copyright Agent Contact').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText('Submitting a DMCA Takedown Notice').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText('Counter-Notification & Content Restoration').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Repeat Infringer Policy (Three-Strike Rule)').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Reels Audio, Fair Use & Liability Disclaimers').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders Designated Agent email and Kyiv location', () => {
    render(
      <MemoryRouter>
        <CopyrightPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/copyright@eternal\.app/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kyiv, Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <CopyrightPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ПОЛІТИКА ЗАХИСТУ АВТОРСЬКИХ ПРАВ (DMCA)')).toBeInTheDocument();
    expect(screen.getAllByText('Загальні положення та Safe Harbor').length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
