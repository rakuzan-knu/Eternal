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

    expect(screen.getByText(/Eternal Project Information – Impressum/i)).toBeInTheDocument();
    expect(screen.queryByText(/Eternal Inc\./i)).not.toBeInTheDocument();
    expect(screen.getByText(/software and digital communication project/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ukraine/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/support@eternal.app/i)).toBeInTheDocument();

    // Verify Owners in English
    expect(screen.getByText(/^Ag Mykola$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Ag Mihal$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ilya Podorozhnyi/i)).not.toBeInTheDocument();
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

    expect(screen.getByText(/Інформація про проєкт Eternal – Impressum/i)).toBeInTheDocument();
    expect(screen.getByText(/^Ag Mykola$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Ag Mihal$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ілля Подорожній/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/проєкт програмного забезпечення та цифрових комунікацій/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Україна/i).length).toBeGreaterThan(0);
  });
});
