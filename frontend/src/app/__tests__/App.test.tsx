import { screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAuthStore } from '@/shared/model/useAuthStore';

vi.mock('@/features/chat/model/usePresence', () => ({
  useQueryOnlineStatus: vi.fn(),
  usePresenceSync: vi.fn(),
}));

vi.mock('@/features/chat/model/useUnreadMessagesCount', () => ({
  useUnreadMessagesCount: () => 0,
}));

vi.mock('@/features/chat/ui/MessageToastViewport', () => ({
  default: () => null,
}));

vi.mock('@/pages/Feed/Feed', () => ({
  default: () => <div>Feed Content</div>,
}));

describe('App', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

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

  it('redirects /login to the home/feed route when authenticated', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/login'] });

    expect(await screen.findByText('Feed Content')).toBeInTheDocument();
  });

  it('redirects /register to the home/feed route when authenticated', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/register'] });

    expect(await screen.findByText('Feed Content')).toBeInTheDocument();
  });
});
