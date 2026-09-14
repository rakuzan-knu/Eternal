import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SafetyCenterPage } from '../SafetyCenterPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

function renderWithProviders(ui: React.ReactElement, initialRoute = '/safety') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/safety" element={ui} />
        <Route path="/privacy" element={<div>Privacy Page</div>} />
        <Route path="/safety-family-center" element={<div>Family Center Page</div>} />
        <Route path="/safety-policies" element={<div>Policy Hub Page</div>} />
        <Route path="/guidelines" element={<div>Guidelines Page</div>} />
        <Route path="/category/:categoryId" element={<div>Category Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SafetyCenterPage', () => {
  beforeEach(() => {
    useLanguageStore.setState({ currentLanguage: 'English' });
  });

  it('renders hero title and subtitle in English', () => {
    renderWithProviders(<SafetyCenterPage />);
    expect(screen.getByText('ETERNAL SAFETY CENTER')).toBeInTheDocument();
    expect(
      screen.getByText(/Eternal is a communication platform built for meaningful connections/i),
    ).toBeInTheDocument();
  });

  it('renders all eight core safety hubs', () => {
    renderWithProviders(<SafetyCenterPage />);
    expect(screen.getByText('SAFETY LIBRARY')).toBeInTheDocument();
    expect(screen.getByText('PRIVACY HUB')).toBeInTheDocument();
    expect(screen.getByText('PARENT HUB')).toBeInTheDocument();
    expect(screen.getByText('TRANSPARENCY HUB')).toBeInTheDocument();
    expect(screen.getByText('SAFETY NEWS HUB')).toBeInTheDocument();
    expect(screen.getByText('POLICY HUB')).toBeInTheDocument();
    expect(screen.getByText('TEEN CHARTER')).toBeInTheDocument();
    expect(screen.getByText('WELLBEING HUB')).toBeInTheDocument();
  });

  it('does not contain the duplicate self-referential help section', () => {
    renderWithProviders(<SafetyCenterPage />);
    expect(screen.queryByText("WE'RE HERE TO HELP!")).toBeNull();
  });

  it('switches to Ukrainian language correctly across all 8 hubs', () => {
    useLanguageStore.setState({ currentLanguage: 'Українська' });
    renderWithProviders(<SafetyCenterPage />);
    expect(screen.getByText('ЦЕНТР БЕЗПЕКИ ETERNAL')).toBeInTheDocument();
    expect(screen.getByText('БІБЛІОТЕКА БЕЗПЕКИ')).toBeInTheDocument();
    expect(screen.getByText('ХАБ ПРИВАТНОСТІ')).toBeInTheDocument();
    expect(screen.getByText('ХАБ ДЛЯ БАТЬКІВ')).toBeInTheDocument();
    expect(screen.getByText('ХАБ ПРОЗОРОСТІ')).toBeInTheDocument();
    expect(screen.getByText('НОВИНИ БЕЗПЕКИ')).toBeInTheDocument();
    expect(screen.getByText('ХАБ ПРАВИЛ ТА ПОЛІТИК')).toBeInTheDocument();
    expect(screen.getByText('ХАРТІЯ ПІДЛІТКІВ')).toBeInTheDocument();
    expect(screen.getByText('ХАБ БЛАГОПОЛУЧЧЯ')).toBeInTheDocument();
  });
});
