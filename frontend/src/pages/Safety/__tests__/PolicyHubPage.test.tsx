import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PolicyHubPage } from '../PolicyHubPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

function renderWithProviders(ui: React.ReactElement, initialRoute = '/safety-policies') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/safety-policies" element={ui} />
        <Route path="/guidelines" element={<div>Guidelines Page</div>} />
        <Route path="/safety" element={<div>Safety Center</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PolicyHubPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title, subtitle and CTA button in English', () => {
    renderWithProviders(<PolicyHubPage />);
    expect(screen.getByText('ETERNAL POLICY HUB')).toBeInTheDocument();
    expect(
      screen.getByText(/Learn about our Community Guidelines, developed to help keep people safe/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Community Guidelines').length).toBeGreaterThan(0);
  });

  it('renders filter tabs and policy explainer cards', () => {
    renderWithProviders(<PolicyHubPage />);
    expect(screen.getByText('POLICY EXPLAINERS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'User Safety' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Platform Integrity' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Regulated or Illegal Activities' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();

    // Check presence of key policy cards
    expect(screen.getByText('Violent Extremism Policy Explainer')).toBeInTheDocument();
    expect(screen.getByText('Violence and Graphic Content Policy Explainer')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized Copyright Access Policy Explainer')).toBeInTheDocument();
  });

  it('filters policy explainer cards by category', () => {
    renderWithProviders(<PolicyHubPage />);

    // Click "Platform Integrity" filter
    const platformIntegrityBtn = screen.getByRole('button', { name: 'Platform Integrity' });
    fireEvent.click(platformIntegrityBtn);

    // Platform integrity items should appear
    expect(screen.getByText('Misinformation Policy Explainer')).toBeInTheDocument();
    expect(screen.getByText('Identity and Authenticity Policy Explainer')).toBeInTheDocument();

    // Non-platform integrity item should not be in the filtered list
    expect(screen.queryByText('Violent Extremism Policy Explainer')).toBeNull();
  });

  it('opens detail modal when clicking a policy explainer card and closes it', () => {
    renderWithProviders(<PolicyHubPage />);

    // Click Violent Extremism card
    const cardTitle = screen.getByText('Violent Extremism Policy Explainer');
    fireEvent.click(cardTitle);

    // Modal elements
    expect(screen.getByText('Key Policy Tenets & Enforcement Rules')).toBeInTheDocument();
    expect(screen.getByText('Full Community Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Close Explainer')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByText('Close Explainer'));
    expect(screen.queryByText('Key Policy Tenets & Enforcement Rules')).toBeNull();
  });

  it('renders Ukrainian translations correctly', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    renderWithProviders(<PolicyHubPage />);

    expect(screen.getByText('ХАБ ПРАВИЛ ТА ПОЛІТИК ETERNAL')).toBeInTheDocument();
    expect(screen.getByText('ПОЯСНЕННЯ НАШИХ ПОЛІТИК')).toBeInTheDocument();
    expect(screen.getAllByText('Правила спільноти').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Безпека користувачів' })).toBeInTheDocument();
    expect(screen.getByText('Пояснення політики: Насильницький екстремізм')).toBeInTheDocument();
  });
});
