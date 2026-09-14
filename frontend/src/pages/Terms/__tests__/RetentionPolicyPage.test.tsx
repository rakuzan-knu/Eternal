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
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
    expect(
      screen.getByText(/how long Eternal Inc. \(headquartered in Kyiv, Ukraine\) retains/i),
    ).toBeInTheDocument();
  });

  it('renders all 5 retention policy sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByText('Information You Can Delete Directly').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Information Retained During Account Lifetime').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Retention Periods for Specific Business & Legal Purposes/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('What Happens When You Delete Your Account').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Your Legal Rights & Contact Information').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders specific operational retention timeframes (60 days, 30-45 days, 5 years)', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Age Verification Records:/i)).toBeInTheDocument();
    expect(screen.getByText(/Database Backups:/i)).toBeInTheDocument();
    expect(screen.getByText(/Tax & Financial Accounting:/i)).toBeInTheDocument();
    expect(screen.getByText(/Trust, Safety & Fraud Prevention:/i)).toBeInTheDocument();
  });

  it('renders DPO contact information with Kyiv location', () => {
    render(
      <MemoryRouter>
        <RetentionPolicyPage />
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
        <RetentionPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ПОЛІТИКА ЗБЕРІГАННЯ ТА ВИДАЛЕННЯ ДАНИХ')).toBeInTheDocument();
    expect(
      screen.getAllByText('Інформація, яку ви можете видалити самостійно').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
