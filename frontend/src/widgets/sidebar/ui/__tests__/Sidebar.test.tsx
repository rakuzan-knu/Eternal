import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import Sidebar from '../Sidebar';
import { useUIStore } from '../../../../shared/model/useUIStore';
import { resetUIStore } from '../../../../test/resetUIStore';

function renderSidebar(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  afterEach(() => {
    resetUIStore();
  });

  it('renders collapsed by default', () => {
    renderSidebar();

    expect(screen.getByText('Головна').closest('aside')).toHaveClass('w-20');
  });

  it('expands on mouse enter and updates the store', () => {
    renderSidebar();
    const aside = screen.getByText('Головна').closest('aside')!;

    fireEvent.mouseEnter(aside);

    expect(useUIStore.getState().isSidebarExpanded).toBe(true);
    expect(aside).toHaveClass('w-64');
  });

  it('collapses again on mouse leave', () => {
    renderSidebar();
    const aside = screen.getByText('Головна').closest('aside')!;
    fireEvent.mouseEnter(aside);

    fireEvent.mouseLeave(aside);

    expect(useUIStore.getState().isSidebarExpanded).toBe(false);
    expect(aside).toHaveClass('w-20');
  });

  it('renders all navigation menu items with their target routes', () => {
    renderSidebar();

    expect(screen.getByText('Головна').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Пошук').closest('a')).toHaveAttribute('href', '/search');
    expect(screen.getByText('Цікаве').closest('a')).toHaveAttribute('href', '/explore');
    expect(screen.getByText('Повідомлення').closest('a')).toHaveAttribute('href', '/messages');
    expect(screen.getByText('Сповіщення').closest('a')).toHaveAttribute('href', '/notifications');
    expect(screen.getByText('Створити').closest('a')).toHaveAttribute('href', '/create');
  });

  it('marks the current route as active', () => {
    renderSidebar(['/search']);

    expect(screen.getByText('Пошук').closest('a')).toHaveClass('bg-white/10');
    expect(screen.getByText('Головна').closest('a')).not.toHaveClass('bg-white/10');
  });

  it('links the profile shortcut to /ayate', () => {
    renderSidebar();

    expect(screen.getByText('Ayate').closest('a')).toHaveAttribute('href', '/ayate');
  });

  it('marks the profile shortcut as active when on /ayate', () => {
    renderSidebar(['/ayate']);

    expect(screen.getByText('Ayate').closest('a')).toHaveClass('bg-white/10');
  });
});
