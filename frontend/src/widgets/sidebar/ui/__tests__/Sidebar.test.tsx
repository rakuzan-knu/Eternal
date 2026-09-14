import { fireEvent, screen, act } from '@testing-library/react';
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
    act(() => {
      useAuthStore.getState().setAuth('user-1');
    });
  });

  afterEach(() => {
    act(() => {
      resetUIStore();
      useAuthStore.getState().clearAuth();
    });
  });

  it('renders collapsed by default', () => {
    act(() => {
      renderWithProviders(<Sidebar />);
    });

    expect(screen.getByText('Home').closest('aside')).toHaveClass('w-20');
  });

  it('expands on mouse enter and updates the store', () => {
    act(() => {
      renderWithProviders(<Sidebar />);
    });
    const aside = screen.getByText('Home').closest('aside')!;

    act(() => {
      fireEvent.mouseEnter(aside);
    });

    expect(useUIStore.getState().isSidebarExpanded).toBe(true);
    expect(aside).toHaveClass('w-[256px]');
  });

  it('collapses again on mouse leave', () => {
    act(() => {
      renderWithProviders(<Sidebar />);
    });
    const aside = screen.getByText('Home').closest('aside')!;
    act(() => {
      fireEvent.mouseEnter(aside);
    });

    act(() => {
      fireEvent.mouseLeave(aside);
    });

    expect(useUIStore.getState().isSidebarExpanded).toBe(false);
    expect(aside).toHaveClass('w-20');
  });

  it('renders all navigation menu items with their target routes', () => {
    act(() => {
      renderWithProviders(<Sidebar />);
    });

    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Search').closest('a')).toHaveAttribute('href', '/search');
    expect(screen.getByText('Music Hub').closest('a')).toHaveAttribute('href', '/music');
    expect(screen.getByText('Message').closest('a')).toHaveAttribute('href', '/messages');
    expect(screen.getByText('Notifications').closest('a')).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(screen.getByText('Create').closest('a')).toHaveAttribute('href', '/create');
  });

  it('marks the current route as active', () => {
    act(() => {
      renderWithProviders(<Sidebar />, { initialEntries: ['/search'] });
    });

    expect(screen.getByText('Search').closest('a')).toHaveClass('bg-white/10');
    expect(screen.getByText('Home').closest('a')).not.toHaveClass('bg-white/10');
  });

  it('falls back to a generic profile link when no user is authenticated', () => {
    act(() => {
      useAuthStore.getState().clearAuth();
      useUIStore.getState().setSidebarExpanded(true);
      renderWithProviders(<Sidebar />);
    });

    expect(screen.getByText('Profile').closest('a')).toHaveAttribute('href', '/');
  });

  it('opens and closes the Create popup menu when clicking Create', () => {
    act(() => {
      useUIStore.getState().setSidebarExpanded(true);
      renderWithProviders(<Sidebar />);
    });

    const createLink = screen.getByText('Create').closest('a')!;
    act(() => {
      fireEvent.click(createLink);
    });

    expect(screen.getByText('Create Post')).toBeInTheDocument();
    expect(screen.getByText('Create Story')).toBeInTheDocument();

    act(() => {
      fireEvent.click(createLink);
    });
    expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
  });

  it('opens More menu with full settings and options on click', () => {
    act(() => {
      useUIStore.getState().setSidebarExpanded(true);
      renderWithProviders(<Sidebar />);
    });

    const moreBtn = screen.getByRole('button', { name: /more/i });
    act(() => {
      fireEvent.click(moreBtn);
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Change appearance')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });
});
