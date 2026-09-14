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

  it('renders all footer links with correct routes', () => {
    render(
      <MemoryRouter>
        <AuthFooter />
      </MemoryRouter>,
    );

    const expectedLinks = [
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Cookies', path: '/terms/cookie-policy' },
      { label: 'About', path: '/company' },
      { label: 'Help', path: '/safety' },
    ];

    expectedLinks.forEach(({ label, path }) => {
      const el = screen.getByText(label);
      expect(el).toBeInTheDocument();
      expect(el.closest('a')).toHaveAttribute('href', path);
    });
  });
});
