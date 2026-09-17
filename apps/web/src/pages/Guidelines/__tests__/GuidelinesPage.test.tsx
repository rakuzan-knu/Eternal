import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { GuidelinesPage } from '../GuidelinesPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Community Guidelines Page', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the Guidelines page header, sections, and table of contents', () => {
    render(
      <BrowserRouter>
        <GuidelinesPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/ETERNAL COMMUNITY GUIDELINES/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Welcome to Eternal & Our Community Values/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Briefly about this/i).length).toBeGreaterThan(0);
  });

  it('switches to Ukrainian dynamically and updates hero title and content', () => {
    render(
      <BrowserRouter>
        <GuidelinesPage />
      </BrowserRouter>,
    );

    // Open language menu and switch to Ukrainian
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    const ukraineOption = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukraineOption);

    expect(screen.getByText(/ПРАВИЛА СПІЛЬНОТИ ETERNAL/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Коротко про це/i).length).toBeGreaterThan(0);
  });
});
