import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DownloadPage } from '../DownloadPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import App from '../../../app/App';
import { renderWithProviders } from '../../../test/renderWithProviders';

describe('Download Page (/download)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it('renders Hero section with smart OS detection download button and preview', () => {
    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    // Hero title
    expect(
      screen.getByRole('heading', { level: 1, name: /DOWNLOAD ETERNAL WHEREVER YOU HANG OUT/i }),
    ).toBeInTheDocument();

    // Hero smart OS download button
    expect(screen.getByRole('button', { name: /Download for Windows/i })).toBeInTheDocument();

    // Desktop live video preview
    expect(screen.getByText(/Eternal • Gametime Live/i)).toBeInTheDocument();
    expect(screen.getByText(/Cyberpunk Arena 2077/i)).toBeInTheDocument();
  });

  it('renders DOWNLOAD FOR DESKTOP section with macOS, Windows, and Linux dropdowns', () => {
    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /DOWNLOAD FOR DESKTOP/i }),
    ).toBeInTheDocument();

    // macOS button
    expect(screen.getByRole('button', { name: /macOS/i })).toBeInTheDocument();

    // Windows dropdown button
    const windowsBtn = screen.getByRole('button', { name: /^Windows$/i });
    expect(windowsBtn).toBeInTheDocument();
    fireEvent.click(windowsBtn);

    // Check Windows dropdown items (x64 and ARM64)
    expect(screen.getByRole('button', { name: /^x64/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ARM64/i })).toBeInTheDocument();

    // Linux dropdown button
    const linuxBtn = screen.getByRole('button', { name: /^Linux$/i });
    expect(linuxBtn).toBeInTheDocument();
    fireEvent.click(linuxBtn);

    // Check Linux dropdown items (deb, tar.gz, rpm, pkg.tar.zst)
    expect(screen.getByRole('button', { name: /deb/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tar\.gz/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rpm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pkg\.tar\.zst/i })).toBeInTheDocument();
  });

  it('renders DOWNLOAD FOR MOBILE section with App Store and Google Play buttons', () => {
    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /DOWNLOAD FOR MOBILE/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /App Store/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google Play/i })).toBeInTheDocument();
  });

  it('switches to Ukrainian dynamically and updates headings', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /ЗАВАНТАЖУЙ ETERNAL ДЛЯ БУДЬ-ЯКИХ ПРИСТРОЇВ/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 2, name: /ЗАВАНТАЖИТИ ДЛЯ КОМП’ЮТЕРА/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 2, name: /ЗАВАНТАЖИТИ ДЛЯ ТЕЛЕФОНУ/i }),
    ).toBeInTheDocument();
  });

  it('is publicly accessible directly via /download without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/download'] });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /DOWNLOAD ETERNAL WHEREVER YOU HANG OUT/i }),
      ).toBeInTheDocument();
    });
  });
});
