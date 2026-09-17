import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApplicantCandidatePrivacyPage } from '../ApplicantCandidatePrivacyPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('ApplicantCandidatePrivacyPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero header and company notice with Kyiv location', () => {
    render(
      <MemoryRouter>
        <ApplicantCandidatePrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('APPLICANT AND CANDIDATE PRIVACY POLICY')).toBeInTheDocument();
    expect(
      screen.getByText(/Notice of Data Collection, Processing and Transfer/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Kyiv, Ukraine/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 6 numbered policy sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <ApplicantCandidatePrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('The information we collect').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How we use your information').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How we disclose your information').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText('Data Retention').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Rights regarding the use and processing/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Data Protection Officer').length).toBeGreaterThanOrEqual(1);
  });

  it('renders DPO contact information and email address', () => {
    render(
      <MemoryRouter>
        <ApplicantCandidatePrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/private-contact-not-provided/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/privacy@eternal.com/i).length).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <ApplicantCandidatePrivacyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ ДЛЯ КАНДИДАТІВ ТА ПРЕТЕНДЕНТІВ'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Офіцер із захисту даних (DPO)').length).toBeGreaterThanOrEqual(1);
  });
});
