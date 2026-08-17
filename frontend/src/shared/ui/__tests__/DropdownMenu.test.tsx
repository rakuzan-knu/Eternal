import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DropdownMenu, { type DropdownMenuItem } from '../DropdownMenu';

describe('DropdownMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders menu items and triggers item onClick', () => {
    const onItemClick = vi.fn();
    const onClose = vi.fn();

    const items: DropdownMenuItem[] = [
      { key: 'edit', label: 'Edit Profile', onClick: onItemClick },
      { key: 'delete', label: 'Delete Account', danger: true },
    ];

    render(<DropdownMenu items={items} onClose={onClose} />);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit Profile'));
    expect(onItemClick).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalled();
  });
});
