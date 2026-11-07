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

    expect(screen.getByText(/Eternal Project Information/i)).toBeInTheDocument();
    expect(screen.queryByText(/Eternal Inc\./i)).not.toBeInTheDocument();
    expect(screen.getByText(/software and digital communication project/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ukraine/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'eternalnet.support@proton.me' })).toHaveAttribute(
      'href',
      'mailto:eternalnet.support@proton.me',
    );
    expect(document.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Copy$/i })).not.toBeInTheDocument();

    // Verify Owners in English
    expect(screen.getByText(/^Mykola Agh$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Michal Agh$/i)).toBeInTheDocument();
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

    expect(screen.getByText(/Інформація про проєкт Eternal/i)).toBeInTheDocument();
    expect(screen.getByText(/^Mykola Agh$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Michal Agh$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ілля Подорожній/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/проєкт програмного забезпечення та цифрових комунікацій/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Україна/i).length).toBeGreaterThan(0);
  });
});
