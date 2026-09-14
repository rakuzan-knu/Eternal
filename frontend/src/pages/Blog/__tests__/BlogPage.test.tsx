import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BlogPage } from '../BlogPage';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import App from '../../../app/App';
import { renderWithProviders } from '../../../test/renderWithProviders';

describe('Blog Page (/blog)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
    useAuthStore.setState({ isAuthenticated: false, userId: null });
  });

  it('renders ETERNAL BLOG hero, top community letter article, and search bar', () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );

    // Hero title & featured letter
    expect(screen.getByRole('heading', { level: 1, name: /ETERNAL BLOG/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /A LETTER TO THE ETERNAL COMMUNITY/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search.../i)).toBeInTheDocument();
  });

  it('renders Featured and Explore Further articles sections', () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );

    // Featured articles
    expect(
      screen.getByText(/Next-Gen Communication: The Launch of Eternal Messenger/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Express Yourself: Custom Liquid Chat Themes & Gradients/i),
    ).toBeInTheDocument();

    // Explore Further section
    expect(screen.getByRole('heading', { level: 2, name: /EXPLORE FURTHER/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Share Your Moments: Introducing Eternal Stories/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Infinite Exploration: Introducing the High-Performance Feed Algorithm/i),
    ).toBeInTheDocument();
  });

  it('filters articles dynamically by search query', () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText(/Search.../i);
    fireEvent.change(searchInput, { target: { value: 'Patch Notes' } });

    expect(
      screen.getByText(/Eternal Patch Notes: Performance, Instant Image Compression/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Share Your Moments: Introducing Eternal Stories/i),
    ).not.toBeInTheDocument();
  });

  it('filters articles dynamically by category dropdown selection', () => {
    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );

    const dropdownTrigger = screen.getByRole('button', { name: /Featured/i });
    fireEvent.click(dropdownTrigger);

    const engineeringOption = screen.getByRole('button', { name: /^Engineering$/i });
    fireEvent.click(engineeringOption);

    // Engineering post should be present
    expect(
      screen.getByText(/Eternal Patch Notes: Performance, Instant Image Compression/i),
    ).toBeInTheDocument();
  });

  it('switches to Ukrainian dynamically and updates headings', () => {
    useLanguageStore.getState().setLanguage('Українська');

    render(
      <MemoryRouter>
        <BlogPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /БЛОГ ETERNAL/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /ЛИСТ ДО СПІЛЬНОТИ ETERNAL/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /БІЛЬШЕ СТАТЕЙ/i })).toBeInTheDocument();
  });

  it('is publicly accessible directly via /blog without requiring login', async () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });

    renderWithProviders(<App />, { initialEntries: ['/blog'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /ETERNAL BLOG/i })).toBeInTheDocument();
    });
  });
});
