import { screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useUIStore } from '@/shared/model/useUIStore';

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

vi.mock('@/pages/Search/SearchPage', () => ({
  default: () => <div>Search Page Content</div>,
}));

vi.mock('@/pages/Notifications/NotificationsPage', () => ({
  NotificationsPage: () => <div>Notifications Content</div>,
}));

vi.mock('@/pages/Profile/Profile', () => ({
  default: () => <div>Profile Page Content</div>,
}));

vi.mock('@/pages/Chat/Messenger', () => ({
  default: () => <div>Messenger Content</div>,
}));

vi.mock('@/pages/Reels/ReelsPage', () => ({
  default: () => <div>Reels Content</div>,
  ReelsPage: () => <div>Reels Content</div>,
}));

describe('App', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
      useUIStore.getState().setSidebarExpanded(false);
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

  it('redirects to login for the root route while unauthenticated', async () => {
    renderWithProviders(<App />, { initialEntries: ['/'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('redirects to login for an arbitrary unknown route while unauthenticated', async () => {
    renderWithProviders(<App />, { initialEntries: ['/some/deep/unknown/route'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('redirects to login for an unauthenticated user on /:username', async () => {
    renderWithProviders(<App />, { initialEntries: ['/some_user'] });

    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('renders the not-found page for /404 route while unauthenticated', async () => {
    renderWithProviders(<App />, { initialEntries: ['/404'] });

    expect(await screen.findByText(/LOST IN THE MILKY WAY/i)).toBeInTheDocument();
  });

  it('redirects /login to the home/feed route when authenticated', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/login'] });

    expect(await screen.findByText('Feed Content', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('redirects /register to the home/feed route when authenticated', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/register'] });

    expect(await screen.findByText('Feed Content')).toBeInTheDocument();
  });

  it('renders authenticated search route', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/search'] });
    expect(await screen.findByText('Search Page Content')).toBeInTheDocument();
  });

  it('renders authenticated notifications route', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/notifications'] });
    expect(await screen.findByText('Notifications Content')).toBeInTheDocument();
  });

  it('renders authenticated reels route', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/reels'] });
    expect(await screen.findByText('Reels Content')).toBeInTheDocument();
  });

  it('renders authenticated profile route', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/profile'] });
    expect(await screen.findByText('Profile Page Content')).toBeInTheDocument();
  });

  it('renders authenticated messenger route', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
    });

    renderWithProviders(<App />, { initialEntries: ['/messages'] });
    expect(await screen.findByText('Messenger Content', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('handles sidebar expanded and collapsed main padding', async () => {
    act(() => {
      useAuthStore.getState().setAuth('user-123');
      useUIStore.getState().setSidebarExpanded(true);
    });

    renderWithProviders(<App />, { initialEntries: ['/feed'] });
    expect(await screen.findByText('Feed Content', {}, { timeout: 4000 })).toBeInTheDocument();
    const main = document.querySelector('main');
    expect(main).toHaveClass('pl-72');

    act(() => {
      useUIStore.getState().setSidebarExpanded(false);
    });
    expect(main).toHaveClass('pl-24');
  });
});
