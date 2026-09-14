import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataPrivacyControlsPage } from '../DataPrivacyControlsPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('DataPrivacyControlsPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, dates, and location note', () => {
    render(
      <MemoryRouter>
        <DataPrivacyControlsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('DATA PRIVACY CONTROLS')).toBeInTheDocument();
    expect(
      screen.getByText(/User Settings > Privacy > Profile Privacy & Data Controls/i),
    ).toBeInTheDocument();
  });

  it('renders interactive settings simulator with interactive switches and dimensions', () => {
    render(
      <MemoryRouter>
        <DataPrivacyControlsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Live Interactive Demo')).toBeInTheDocument();
    expect(screen.getAllByText('Private Account').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Recommendations & Discovery')).toBeInTheDocument();
    expect(screen.getByText('Who Can See You and Contact You')).toBeInTheDocument();
    expect(screen.getByText('Use data to improve Eternal')).toBeInTheDocument();
  });

  it('allows clicking switches and cycling privacy dimensions', () => {
    render(
      <MemoryRouter>
        <DataPrivacyControlsPage />
      </MemoryRouter>,
    );

    const autoPlayBtn = screen.getByText('Auto-Play');
    fireEvent.click(autoPlayBtn);
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('renders all 6 policy sections in TOC and main content', () => {
    render(
      <MemoryRouter>
        <DataPrivacyControlsPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Accessing Your Privacy Controls').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Profile Visibility & Communication Dimensions').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Account Privacy Modes & Discovery').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText('Data Processing & Personalization Toggles').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Requesting Your Complete Data Package').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Questions and Data Protection Officer').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('supports Ukrainian language switching', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });

    render(
      <MemoryRouter>
        <DataPrivacyControlsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('ЕЛЕМЕНТИ КЕРУВАННЯ КОНФІДЕНЦІЙНІСТЮ')).toBeInTheDocument();
    expect(
      screen.getAllByText('Доступ до налаштувань конфіденційності').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
