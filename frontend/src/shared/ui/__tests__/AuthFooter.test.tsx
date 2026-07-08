import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthFooter } from '../AuthFooter';

describe('AuthFooter', () => {
  it('renders the copyright text', () => {
    render(
      <MemoryRouter>
        <AuthFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Eternal © 2026')).toBeInTheDocument();
  });

  it('renders all footer links', () => {
    render(
      <MemoryRouter>
        <AuthFooter />
      </MemoryRouter>,
    );

    ['Privacy Policy', 'Terms of Service', 'Cookies', 'About', 'Help'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders footer links as anchors', () => {
    render(
      <MemoryRouter>
        <AuthFooter />
      </MemoryRouter>,
    );

    expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute('href', '/');
  });
});
