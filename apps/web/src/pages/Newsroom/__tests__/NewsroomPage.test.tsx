import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NewsroomPage } from '../NewsroomPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';

describe('Newsroom Page (/newsroom)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it('renders Press Center hero section, 3D mascots, and View Brand Kit CTA', () => {
    render(
      <MemoryRouter>
        <NewsroomPage />
      </MemoryRouter>,
    );

    // Hero title & subtitle
    expect(screen.getByRole('heading', { level: 1, name: /PRESS CENTER/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Explore the latest announcements and news from Eternal/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Brand Kit/i })).toBeInTheDocument();
  });

  it('renders PRESS RELEASES AND ANNOUNCEMENTS section with recent feature releases', () => {
    render(
      <MemoryRouter>
        <NewsroomPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /PRESS RELEASES AND ANNOUNCEMENTS/i }),
    ).toBeInTheDocument();

    // Check cards: Legal Hub, Chat Themes, Stories, Voice Notes
    expect(screen.getByText(/Eternal Expands Platform Transparency/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Express Yourself: Eternal Introduces Custom Liquid Chat Themes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Share Your Moments: Introducing Eternal Stories/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Voice Notes & Video Circles/i)).toBeInTheDocument();
  });

  it('renders UPDATES FROM THE ETERNAL BLOG with Messenger, Feed, and Genesis cards', () => {
    render(
      <MemoryRouter>
        <NewsroomPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: /UPDATES FROM THE ETERNAL BLOG/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Next-Gen Communication: The Launch of Eternal Messenger/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Infinite Exploration: Introducing the High-Performance Feed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Building from Scratch: The Genesis and Vision Behind the Eternal Social Platform/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders ETERNAL BRAND KIT callout and CONTACT OUR PRESS TEAM sections', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });

    render(
      <MemoryRouter>
        <NewsroomPage />
      </MemoryRouter>,
    );

    // Brand Kit callout
    expect(
      screen.getByRole('heading', { level: 2, name: /ETERNAL BRAND KIT/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We REALLY love when people do it with correct brand assets/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Learn More/i })).toBeInTheDocument();

    // Contact Press Team
    expect(
      screen.getByRole('heading', { level: 2, name: /CONTACT OUR PRESS TEAM/i }),
    ).toBeInTheDocument();
    const contactBtn = screen.getByRole('link', { name: /Contact Us/i });
    expect(contactBtn).toBeInTheDocument();

    expect(contactBtn).toHaveAttribute('href', 'mailto:eternalnet.support@proton.me');
    expect(window.location.href).toBe('');
    expect(screen.getByText(/Press contact: eternalnet\.support@proton\.me/i)).toBeInTheDocument();

    // Restore location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('switches to Ukrainian dynamically and updates headings', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter>
        <NewsroomPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /ПРЕС-ЦЕНТР/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ПРЕС-РЕЛІЗИ ТА ОФІЦІЙНІ АНОНСИ/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /НОВИНИ З БЛОГУ ETERNAL/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ФІРМОВИЙ НАБІР ETERNAL BRAND KIT/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ЗВ’ЯЗОК З ПРЕС-СЛУЖБОЮ/i }),
    ).toBeInTheDocument();
  });
});
