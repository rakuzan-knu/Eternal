import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { LicensesPage } from '../LicensesPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Licenses Page', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the Licenses page header, disclaimer, software groups, and fonts section', () => {
    render(
      <BrowserRouter>
        <LicensesPage />
      </BrowserRouter>,
    );

    expect(screen.getAllByText(/Licenses/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Licenses for OSS used in Eternal are reproduced below/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES/i)).toBeInTheDocument();
    expect(screen.getByText(/MIT License/i)).toBeInTheDocument();
    expect(screen.getByText(/Apache License 2.0/i)).toBeInTheDocument();

    // Verify Fonts and SIL OFL 1.1
    expect(screen.getAllByText(/Fonts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SIL Open Font License, Version 1.1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Inter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Roboto/i).length).toBeGreaterThan(0);
  });

  it('filters packages and licenses using search bar', () => {
    render(
      <BrowserRouter>
        <LicensesPage />
      </BrowserRouter>,
    );

    const searchInput = screen.getByPlaceholderText(
      /Search licensed software, fonts, or package name.../i,
    );
    fireEvent.change(searchInput, { target: { value: 'prisma' } });

    expect(screen.getByText(/Apache License 2.0/i)).toBeInTheDocument();
    expect(screen.getAllByText(/prisma/i).length).toBeGreaterThan(0);
  });

  it('switches to Ukrainian dynamically and updates title, notices, and fonts section', () => {
    render(
      <BrowserRouter>
        <LicensesPage />
      </BrowserRouter>,
    );

    // Open language menu and switch to Ukrainian
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    const ukraineOption = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukraineOption);

    expect(screen.getAllByText(/Ліцензії/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Ліцензії для відкритого коду \(OSS\) в Eternal наведені нижче/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Шрифти/i).length).toBeGreaterThan(0);
  });
});
