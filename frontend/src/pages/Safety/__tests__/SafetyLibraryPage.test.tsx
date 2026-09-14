import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SafetyLibraryPage } from '../SafetyLibraryPage';

function renderWithProviders(ui: React.ReactElement, initialRoute = '/safety-library') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/safety-library" element={ui} />
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SafetyLibraryPage', () => {
  it('renders hero title, subtitle, and 3D hero illustrations', () => {
    renderWithProviders(<SafetyLibraryPage />);

    expect(screen.getByRole('heading', { level: 1, name: /SAFETY LIBRARY/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Everything you could ever want to know about safety on Eternal/i),
    ).toBeInTheDocument();

    const scrollImg = screen.getByAltText('3D Safety Library Scroll');
    expect(scrollImg).toBeInTheDocument();
    expect(scrollImg).toHaveAttribute('src', '/images/safety/scroll-3d.png');

    const shieldImg = screen.getByAltText('3D Safety Shield');
    expect(shieldImg).toBeInTheDocument();
    expect(shieldImg).toHaveAttribute('src', '/images/safety/shield-3d.png');
  });

  it('renders filter controls and search bar', () => {
    renderWithProviders(<SafetyLibraryPage />);

    expect(screen.getByPlaceholderText(/Search articles, policies, guides/i)).toBeInTheDocument();
    expect(screen.getByText('View All')).toBeInTheDocument();
    expect(screen.getByText('Pick a Topic')).toBeInTheDocument();
  });

  it('filters articles by search input', () => {
    renderWithProviders(<SafetyLibraryPage />);

    const searchInput = screen.getByPlaceholderText(/Search articles, policies, guides/i);
    fireEvent.change(searchInput, { target: { value: 'spam' } });

    expect(screen.getByText('Tips against spam and hacking')).toBeInTheDocument();
    expect(screen.queryByText('Four Steps to Keeping Your Account Safer')).not.toBeInTheDocument();
  });

  it('opens and closes article modal on click', () => {
    renderWithProviders(<SafetyLibraryPage />);

    const articleCard = screen.getByText('Four Steps to Keeping Your Account Safer');
    fireEvent.click(articleCard);

    expect(screen.getByText(/Key Recommendation:/i)).toBeInTheDocument();

    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Key Recommendation:/i)).not.toBeInTheDocument();
  });

  it('loads more articles on "Load More" click', () => {
    renderWithProviders(<SafetyLibraryPage />);

    const loadMoreBtn = screen.getByRole('button', { name: /Load More/i });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(screen.getByText('Protecting Yourself from Social Engineering')).toBeInTheDocument();
  });
});
