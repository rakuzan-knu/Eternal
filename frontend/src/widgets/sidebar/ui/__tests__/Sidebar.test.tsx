import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';
import { useUIStore } from '../../../../shared/model/useUIStore';
import { useAuthStore } from '../../../../shared/model/useAuthStore';
import { resetUIStore } from '../../../../test/resetUIStore';
import { renderWithProviders } from '../../../../test/renderWithProviders';

vi.mock('@/features/chat/model/usePresence', () => ({
  useQueryOnlineStatus: vi.fn(),
}));

vi.mock('@/features/chat/model/useUnreadMessagesCount', () => ({
  useUnreadMessagesCount: () => 0,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('user-1');
  });

  afterEach(() => {
    resetUIStore();
    useAuthStore.getState().clearAuth();
  });

  it('renders collapsed by default', () => {
    renderWithProviders(<Sidebar />);

    expect(screen.getByText('Home').closest('aside')).toHaveClass('w-20');
  });

  it('expands on mouse enter and updates the store', () => {
    renderWithProviders(<Sidebar />);
    const aside = screen.getByText('Home').closest('aside')!;

    fireEvent.mouseEnter(aside);

    expect(useUIStore.getState().isSidebarExpanded).toBe(true);
    expect(aside).toHaveClass('w-[256px]');
  });

  it('collapses again on mouse leave', () => {
    renderWithProviders(<Sidebar />);
    const aside = screen.getByText('Home').closest('aside')!;
    fireEvent.mouseEnter(aside);

    fireEvent.mouseLeave(aside);

    expect(useUIStore.getState().isSidebarExpanded).toBe(false);
    expect(aside).toHaveClass('w-20');
  });

  it('renders all navigation menu items with their target routes', () => {
    renderWithProviders(<Sidebar />);

    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Search').closest('a')).toHaveAttribute('href', '/search');
    expect(screen.getByText('Reels').closest('a')).toHaveAttribute('href', '/reels');
    expect(screen.getByText('Message').closest('a')).toHaveAttribute('href', '/messages');
    expect(screen.getByText('Notifications').closest('a')).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(screen.getByText('Create').closest('a')).toHaveAttribute('href', '/create');
  });

  it('marks the current route as active', () => {
    renderWithProviders(<Sidebar />, { initialEntries: ['/search'] });

    expect(screen.getByText('Search').closest('a')).toHaveClass('bg-white/10');
    expect(screen.getByText('Home').closest('a')).not.toHaveClass('bg-white/10');
  });

  it('falls back to a generic profile link when no user is authenticated', () => {
    useAuthStore.getState().clearAuth();
    useUIStore.getState().setSidebarExpanded(true);
    renderWithProviders(<Sidebar />);

    expect(screen.getByText('Profile').closest('a')).toHaveAttribute('href', '/');
  });
});
