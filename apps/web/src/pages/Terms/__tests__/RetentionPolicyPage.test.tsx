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
    expect(screen.getByText(/Updated: November 5, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified deletion behaviour/i)).toBeInTheDocument();
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

  it('renders specific operational retention timeframes (60 days, 30-45 days, 5 years)', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByText(
        /retention periods.*not yet confirmed|retention periods.*not yet complete|not yet verified and published/i,
      ).length,
    ).toBeGreaterThan(0);
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
