import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegionalPrivacyPage } from '../RegionalPrivacyPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('RegionalPrivacyPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and introduction', () => {
    render(
      <MemoryRouter>
        <RegionalPrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('REGIONAL PRIVACY POLICIES & LOCAL LAWS')).toBeInTheDocument();
    expect(screen.getByText(/Effective: September 1, 2026/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Depending on where you reside or access Eternal from/i),
    ).toBeInTheDocument();
  });

  it('renders all 6 regional policy sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <RegionalPrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/European Economic Area/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/United States State Privacy Rights/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Ukraine National Privacy Regulations/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Other International Jurisdictions/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/How to Exercise Your Regional Privacy Rights/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Data Protection Officer and Supervisory Contacts/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders Ukrainian Law No. 2297-VI details and Kyiv address', () => {
    render(
      <MemoryRouter>
        <RegionalPrivacyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByText(/Law of Ukraine "On Personal Data Protection"/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kyiv, Ukraine/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/private-contact-not-provided/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <RegionalPrivacyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('РЕГІОНАЛЬНІ ПОЛІТИКИ КОНФІДЕНЦІЙНОСТІ ТА МІСЦЕВІ ЗАКОНИ'),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Національне законодавство України/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
