import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BrandingPage } from '../BrandingPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import App from '../../../app/App';
import { renderWithProviders } from '../../../test/renderWithProviders';

describe('Branding Page (/branding, /brand)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
    useAuthStore.setState({ isAuthenticated: false, userId: null });
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders the Hero section, mascots, and CTA button', () => {
    render(
      <MemoryRouter>
        <BrandingPage />
      </MemoryRouter>,
    );

    // Hero Title & Subtitle
    expect(screen.getByRole('heading', { level: 1, name: /BRAND ASSETS/i })).toBeInTheDocument();
    expect(screen.getByText(/Make sure to get our good side/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /View Brand Kit/i })[0]).toBeInTheDocument();
  });

  it('renders OUR LOGO, SYMBOL, CLEARSPACE, COLORS, LEGAL GUIDELINES, and NEED MORE sections', () => {
    render(
      <MemoryRouter>
        <BrandingPage />
      </MemoryRouter>,
    );

    // 1. OUR LOGO
    expect(screen.getByRole('heading', { level: 2, name: /OUR LOGO/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Feel free to use our logo in color, black or white/i),
    ).toBeInTheDocument();

    // 2. SYMBOL
    expect(screen.getByRole('heading', { level: 2, name: /SYMBOL/i })).toBeInTheDocument();
    expect(screen.getByText(/Symbol \(Without Background\)/i)).toBeInTheDocument();
    expect(screen.getByText(/App Icon \(With Rounded Background\)/i)).toBeInTheDocument();

    // 3. CLEARSPACE
    expect(screen.getByRole('heading', { level: 2, name: /CLEARSPACE/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Please do not edit, change, distort, recolor, or reconfigure/i),
    ).toBeInTheDocument();

    // 4. COLORS
    expect(screen.getByRole('heading', { level: 2, name: /COLORS/i })).toBeInTheDocument();
    expect(screen.getByText(/Eternal Purple/i)).toBeInTheDocument();
    expect(screen.getByText(/Messenger Void/i)).toBeInTheDocument();
    expect(screen.getByText(/Pure Black/i)).toBeInTheDocument();

    // 5. LEGAL BRAND GUIDELINES
    expect(
      screen.getByRole('heading', { level: 2, name: /LEGAL BRAND GUIDELINES/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Do’s/i)).toBeInTheDocument();
    expect(screen.getByText(/Don’ts/i)).toBeInTheDocument();

    // 6. NEED MORE?
    expect(screen.getByRole('heading', { level: 2, name: /NEED MORE\?/i })).toBeInTheDocument();
    expect(screen.getByText(/Download the full creative toolkit/i)).toBeInTheDocument();
  });

  it('expands Don’ts accordion and contains links to Terms and Guidelines', () => {
    render(
      <MemoryRouter>
        <BrandingPage />
      </MemoryRouter>,
    );

    const dontsButton = screen.getByRole('button', { name: /Don’ts/i });
    fireEvent.click(dontsButton);

    const termsLink = screen.getByRole('link', { name: /Eternal's Terms of Service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');

    const guidelinesLink = screen.getByRole('link', { name: /Community Guidelines/i });
    expect(guidelinesLink).toBeInTheDocument();
    expect(guidelinesLink).toHaveAttribute('href', '/guidelines');
  });

  it('copies color HEX to clipboard when clicking a color swatch', async () => {
    render(
      <MemoryRouter>
        <BrandingPage />
      </MemoryRouter>,
    );

    const purpleSwatch = screen.getByText(/Eternal Purple/i).closest('div')!;
    fireEvent.click(purpleSwatch);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#5822B4');
  });

  it('switches to Ukrainian dynamically and updates headings', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter>
        <BrandingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /МАТЕРІАЛИ БРЕНДУ/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /НАШ ЛОГОТИП/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /СИМВОЛ/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ОХОРОННА ЗОНА \(CLEARSPACE\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ФІРМОВІ КОЛЬОРИ/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ПРАВИЛА ВИКОРИСТАННЯ БРЕНДУ/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ПОТРІБНО БІЛЬШЕ\?/i }),
    ).toBeInTheDocument();
  });

  it('is publicly accessible directly via /branding without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/branding'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /BRAND ASSETS/i })).toBeInTheDocument();
    });
  });
});
