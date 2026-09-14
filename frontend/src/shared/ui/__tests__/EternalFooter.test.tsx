import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EternalFooter } from '../EternalFooter';
import { useLanguageStore } from '../../lib/language/languageStore';

describe('EternalFooter (/shared/ui/EternalFooter)', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('English');
  });

  it('renders brand mark, language selector, and footer columns', () => {
    render(
      <MemoryRouter>
        <EternalFooter />
      </MemoryRouter>,
    );

    // Brand mark
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('Eternal')).toBeInTheDocument();

    // Language label
    expect(screen.getByText('Language')).toBeInTheDocument();

    // Menu label on mobile
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('toggles mobile accordion sections when clicked', () => {
    render(
      <MemoryRouter>
        <EternalFooter />
      </MemoryRouter>,
    );

    // Find the accordion button for 'Company'
    const companyButtons = screen.getAllByRole('button', { name: /company/i });
    const mobileCompanyBtn = companyButtons[0];

    // Click to open Company accordion
    fireEvent.click(mobileCompanyBtn);

    // Links inside Company should be visible
    expect(screen.getAllByRole('link', { name: /About/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Jobs/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Brand/i })[0]).toBeInTheDocument();
  });

  it('switches language dynamically in footer', () => {
    render(
      <MemoryRouter>
        <EternalFooter />
      </MemoryRouter>,
    );

    // Open language dropdown
    const langBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(langBtn);

    // Select Ukrainian
    const ukBtn = screen.getByRole('button', { name: /Українська/i });
    fireEvent.click(ukBtn);

    // Menu label should now be in Ukrainian
    expect(screen.getByText('Меню')).toBeInTheDocument();
  });

  it('renders Product column without Voice & Video and Music Hub', () => {
    render(
      <MemoryRouter>
        <EternalFooter />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Voice & Video')).not.toBeInTheDocument();
    expect(screen.queryByText('Music Hub')).not.toBeInTheDocument();
    expect(screen.getAllByText('Feed & Discover')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Messenger')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Download')[0]).toBeInTheDocument();
  });
});
