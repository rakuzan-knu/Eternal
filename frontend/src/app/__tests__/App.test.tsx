import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('App', () => {
  it('renders the login page at /login', () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('renders the register page at /register', () => {
    renderWithProviders(<App />, { initialEntries: ['/register'] });

    expect(screen.getByText('Get started on Eternal')).toBeInTheDocument();
  });

  it('renders the forgot-password page at /forgot-password', () => {
    renderWithProviders(<App />, { initialEntries: ['/forgot-password'] });

    expect(screen.getByText('Знайти ваш акаунт')).toBeInTheDocument();
  });

  it('redirects the root route to /login while unauthenticated', () => {
    renderWithProviders(<App />, { initialEntries: ['/'] });

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('redirects an arbitrary unknown route to /login while unauthenticated', () => {
    renderWithProviders(<App />, { initialEntries: ['/some/deep/unknown/route'] });

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('redirects a profile-shaped route (/:username) to /login while unauthenticated', () => {
    renderWithProviders(<App />, { initialEntries: ['/some_user'] });

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});
