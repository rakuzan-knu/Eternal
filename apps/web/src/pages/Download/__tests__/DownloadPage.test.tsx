import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DownloadPage } from '../DownloadPage';
import { DOWNLOAD_TRANSLATIONS } from '@social-network/shared-content';
import { SUPPORTED_LANGUAGES, useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';

describe('Download Page (/download)', () => {
  beforeEach(() => {
    cleanup();
    useLanguageStore.getState().setLanguage('English');
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it('opens the working web entry point without downloading an installer', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/download']}>
        <Routes>
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/login" element={<h1>Sign in to Eternal</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'ETERNAL IN YOUR BROWSER' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Native apps are not available to download yet/)).toBeInTheDocument();
    expect(container.querySelector('a[download]')).toBeNull();
    const schemaText = document.head.querySelector(
      'script[type="application/ld+json"]',
    )?.textContent;
    expect(schemaText).toBeDefined();
    expect(schemaText).not.toContain('SoftwareApplication');
    expect(schemaText).not.toContain('AggregateRating');
    const openWeb = screen.getByRole('link', { name: 'Open Eternal in your browser' });
    expect(openWeb).toHaveAttribute('href', '/login');
    await user.click(openWeb);
    expect(screen.getByRole('heading', { name: 'Sign in to Eternal' })).toBeInTheDocument();
  });

  it('shows each native platform as unavailable instead of an actionable download', () => {
    render(
      <MemoryRouter>
        <DownloadPage />
      </MemoryRouter>,
    );

    for (const platform of ['macOS', 'Windows', 'Linux', 'App Store', 'Google Play']) {
      const label = screen.getByText(platform, { exact: true });
      const item = label.closest('li');
      expect(item).not.toBeNull();
      if (!item) throw new Error(`Missing availability item for ${platform}`);
      expect(within(item).getByText('Not available yet')).toBeInTheDocument();
      expect(within(item).queryByRole('button')).toBeNull();
      expect(within(item).queryByRole('link')).toBeNull();
    }
    expect(
      screen.queryByRole('button', { name: /download|App Store|Google Play|Windows|Linux|macOS/i }),
    ).toBeNull();
    expect(screen.getByText('Interface preview')).toBeInTheDocument();
    for (const preview of document.querySelectorAll('[aria-hidden="true"]')) {
      expect(
        preview.querySelector(
          'a[href], button, input, select, textarea, [tabindex="0"], [contenteditable="true"]',
        ),
      ).toBeNull();
    }
  });

  it.each(SUPPORTED_LANGUAGES.filter((language) => language in DOWNLOAD_TRANSLATIONS))(
    'localizes availability and the web action in %s',
    (language) => {
      useLanguageStore.getState().setLanguage(language);
      render(
        <MemoryRouter>
          <DownloadPage />
        </MemoryRouter>,
      );
      const translations = DOWNLOAD_TRANSLATIONS[language];
      expect(
        screen.getByRole('heading', { level: 1, name: translations.heroTitle }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: translations.openWebApp })).toHaveAttribute(
        'href',
        '/login',
      );
      expect(screen.getAllByText(translations.unavailableLabel)).toHaveLength(5);
    },
  );
});
