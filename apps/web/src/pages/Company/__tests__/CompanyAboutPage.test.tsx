import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompanyAboutPage } from '../CompanyAboutPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

describe('Company About Page (/company)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders the About Eternal header, platform preview, and milestones', () => {
    render(
      <MemoryRouter>
        <CompanyAboutPage />
      </MemoryRouter>,
    );

    // Hero title
    expect(screen.getByRole('heading', { level: 1, name: /ABOUT ETERNAL/i })).toBeInTheDocument();

    // Story heading
    expect(
      screen.getByRole('heading', { level: 2, name: /THE ETERNAL STORY/i }),
    ).toBeInTheDocument();

    // Timeline milestones
    expect(screen.getByText(/JUNE 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/JULY 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/AUGUST 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/2026 AND ON.../i)).toBeInTheDocument();
  });

  it('switches to Ukrainian dynamically and updates story text', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter>
        <CompanyAboutPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /ПРО ETERNAL/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ІСТОРІЯ ETERNAL/i })).toBeInTheDocument();
    expect(screen.getByText(/ЧЕРВЕНЬ 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/ЛИПЕНЬ 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/СЕРПЕНЬ 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/2026 І НАДАЛІ.../i)).toBeInTheDocument();
  });
});
