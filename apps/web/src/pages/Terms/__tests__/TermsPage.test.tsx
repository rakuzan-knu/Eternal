import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { TermsPage } from '../TermsPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Terms of Service Page', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the Terms page header, sections, and table of contents', () => {
    render(
      <BrowserRouter>
        <TermsPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/ETERNAL'S TERMS OF SERVICE/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Welcome to Eternal & Who We Are/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Briefly about this/i).length).toBeGreaterThan(0);
  });

  it('switches to Ukrainian dynamically and updates hero title and content', () => {
    render(
      <BrowserRouter>
        <TermsPage />
      </BrowserRouter>,
    );

    // Open language menu and switch to Ukrainian
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    const ukraineOption = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukraineOption);

    expect(screen.getByText(/УМОВИ ВИКОРИСТАННЯ ETERNAL/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Коротко про це/i).length).toBeGreaterThan(0);
  });
});
