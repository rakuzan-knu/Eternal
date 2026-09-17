import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PaidServicesPage } from '../PaidServicesPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('PaidServicesPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and subscription overview', () => {
    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('PAID SERVICES & REFUND POLICY')).toBeInTheDocument();
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
  });

  it('renders all 5 main sections in TOC and content', () => {
    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByText('Eternal Premium & Paid Features Overview').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Billing, Recurring Subscriptions & Pricing').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Refund Policy & Statutory Withdrawal Rights').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Creator Monetization & Virtual Tipping').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Billing Support & Inquiries').length).toBeGreaterThanOrEqual(1);
  });

  it('renders EU 14-day withdrawal right and billing contact info', () => {
    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/14-Day Right of Withdrawal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/billing@eternal\.app/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('УМОВИ ПЛАТНИХ ПОСЛУГ ТА ПОВЕРНЕННЯ КОШТІВ')).toBeInTheDocument();
    expect(
      screen.getAllByText('Огляд Eternal Premium та платних можливостей').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
