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
    expect(screen.getByText(/Updated: November 5, 2026/i)).toBeInTheDocument();
  });

  it('renders all 5 main sections in TOC and content', () => {
    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Current Availability').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Billing and Subscriptions').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Consumer Rights and Disputed Charges').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Future Paid Features').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contact').length).toBeGreaterThanOrEqual(1);
  });

  it('renders EU 14-day withdrawal right and billing contact info', () => {
    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Your Rights Remain/i)).toBeInTheDocument();
    expect(screen.getAllByText(/eternalnet\.support@proton\.me/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <PaidServicesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('УМОВИ ПЛАТНИХ ПОСЛУГ ТА ПОВЕРНЕННЯ КОШТІВ')).toBeInTheDocument();
    expect(screen.getAllByText('Поточна доступність').length).toBeGreaterThanOrEqual(1);
  });
});
