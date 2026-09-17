import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { CompanyInformationPage } from '../CompanyInformationPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Company Information Page', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the company information, owners, address, and email', () => {
    render(
      <BrowserRouter>
        <CompanyInformationPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Eternal Company Information – Impressum/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Eternal Inc./i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kyiv, Ukraine/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/support@eternal.app/i)).toBeInTheDocument();

    // Verify Owners in English
    expect(screen.getByText(/Nikolaj Agh/i)).toBeInTheDocument();
    expect(screen.getByText(/Mihal Agh/i)).toBeInTheDocument();
    expect(screen.getByText(/Ilya Podorozhnyi/i)).toBeInTheDocument();
  });

  it('switches to Ukrainian dynamically and updates owners names and texts', () => {
    render(
      <BrowserRouter>
        <CompanyInformationPage />
      </BrowserRouter>,
    );

    // Open language menu and switch to Ukrainian
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    const ukraineOption = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukraineOption);

    expect(screen.getByText(/Інформація про компанію Eternal – Impressum/i)).toBeInTheDocument();
    expect(screen.getByText(/Микола Аг/i)).toBeInTheDocument();
    expect(screen.getByText(/Міхал Аг/i)).toBeInTheDocument();
    expect(screen.getByText(/Ілля Подорожній/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Київ, Україна/i).length).toBeGreaterThan(0);
  });
});
