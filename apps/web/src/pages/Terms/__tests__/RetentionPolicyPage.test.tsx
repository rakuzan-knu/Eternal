import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RetentionPolicyPage } from '../RetentionPolicyPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('RetentionPolicyPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and introduction', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('DATA RETENTION POLICY')).toBeInTheDocument();
    expect(screen.getByText(/Updated: November 10, 2026/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Verified provider periods and deletion behaviour/i),
    ).toBeInTheDocument();
  });

  it('renders all 5 retention policy sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Deleting Your Content').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Data Kept While You Use Eternal').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Backups, Media and Other Retention/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Deleting Your Account').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Your Rights and Contact').length).toBeGreaterThanOrEqual(1);
  });

  it('distinguishes verified provider periods from unverified erasure guarantees', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/expire temporary incoming uploads after one day/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sentry Developer documents a 30-day period for newly ingested/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No general 30-day or 45-day purge guarantee applies/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no 15–30 day recovery window/i)).toBeInTheDocument();
    expect(screen.queryByText(/Age Verification Records:/i)).not.toBeInTheDocument();
  });

  it('renders DPO contact information with country and missing contact', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/eternalnet\.support@proton\.me/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ПОЛІТИКА ЗБЕРІГАННЯ ТА ВИДАЛЕННЯ ДАНИХ')).toBeInTheDocument();
    expect(screen.getAllByText('Видалення свого контенту').length).toBeGreaterThanOrEqual(1);
  });
});
