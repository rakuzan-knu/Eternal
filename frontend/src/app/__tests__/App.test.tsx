import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('@/features/chat/model/usePresence', () => ({
  useQueryOnlineStatus: vi.fn(),
}));

vi.mock('@/features/chat/model/useUnreadMessagesCount', () => ({
  useUnreadMessagesCount: () => 0,
}));

vi.mock('@/features/chat/ui/MessageToastViewport', () => ({
  default: () => null,
}));

describe('App', () => {
  it('renders the login page at /login', async () => {
    renderWithProviders(<App />, { initialEntries: ['/login'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('renders the register page at /register', async () => {
    renderWithProviders(<App />, { initialEntries: ['/register'] });

    expect(await screen.findByText('Get started on Eternal')).toBeInTheDocument();
  });

  it('renders the forgot-password page at /forgot-password', async () => {
    renderWithProviders(<App />, { initialEntries: ['/forgot-password'] });

    expect(await screen.findByText('Find your account')).toBeInTheDocument();
  });

  it('redirects the root route to /login while unauthenticated', async () => {
    renderWithProviders(<App />, { initialEntries: ['/'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('redirects an arbitrary unknown route to /login while unauthenticated', async () => {
    renderWithProviders(<App />, { initialEntries: ['/some/deep/unknown/route'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('redirects a profile-shaped route (/:username) to /login while unauthenticated', async () => {
    renderWithProviders(<App />, { initialEntries: ['/some_user'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });
});
