import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransparencyHubPage } from '../TransparencyHubPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('TransparencyHubPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title and subtitle', () => {
    render(
      <MemoryRouter>
        <TransparencyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ETERNAL TRANSPARENCY HUB')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Explore data, trends, and analysis into the work done to help keep people on Eternal safe/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders Transparency Reports and Digital Services Act sections', () => {
    render(
      <MemoryRouter>
        <TransparencyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('TRANSPARENCY REPORTS')).toBeInTheDocument();
    expect(screen.getByText('DIGITAL SERVICES ACT REPORTS')).toBeInTheDocument();
  });

  it('allows opening report dropdowns and initiating download simulation', () => {
    render(
      <MemoryRouter>
        <TransparencyHubPage />
      </MemoryRouter>,
    );

    const downloadButtons = screen.getAllByText('Download Report');
    expect(downloadButtons.length).toBeGreaterThanOrEqual(2);

    // Open first dropdown
    fireEvent.click(downloadButtons[0]);
    expect(screen.getByText('2026: TCO Report')).toBeInTheDocument();

    // Click on a report to trigger toast
    fireEvent.click(screen.getByText('2026: TCO Report'));
    expect(screen.getByText(/Downloading "2026: TCO Report".../i)).toBeInTheDocument();
  });

  it('renders Transparency In Action articles grid and supports Load More', () => {
    render(
      <MemoryRouter>
        <TransparencyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('TRANSPARENCY IN ACTION')).toBeInTheDocument();
    expect(screen.getByText('Transparency in Moderation')).toBeInTheDocument();
    expect(
      screen.getByText('How Trust-Safety Addresses Harmful Content on Eternal'),
    ).toBeInTheDocument();

    const loadMoreBtn = screen.getByText('Load More');
    fireEvent.click(loadMoreBtn);

    expect(screen.getByText('Show Less')).toBeInTheDocument();
    expect(
      screen.getByText('Zero-Knowledge Voice and Direct Message Cryptography Audit'),
    ).toBeInTheDocument();
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <TransparencyHubPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ХАБ ПРОЗОРОСТІ ETERNAL')).toBeInTheDocument();
    expect(screen.getByText('ЗВІТИ ПРО ПРОЗОРІСТЬ')).toBeInTheDocument();
    expect(screen.getByText('ЗВІТИ ЗАКОНУ ПРО ЦИФРОВІ ПОСЛУГИ (DSA)')).toBeInTheDocument();
    expect(screen.getByText('ПРОЗОРІСТЬ У ДІЇ')).toBeInTheDocument();
  });
});
