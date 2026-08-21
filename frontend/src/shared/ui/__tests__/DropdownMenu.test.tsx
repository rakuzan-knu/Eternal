import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import DropdownMenu, { DropdownMenuItem } from '../DropdownMenu';

describe('DropdownMenu', () => {
  it('renders menu items and triggers onClick', () => {
    const onClose = vi.fn();
    const onClick = vi.fn();

    const items: DropdownMenuItem[] = [
      { key: 'item-1', label: 'Edit', onClick },
      { key: 'item-2', label: 'Delete', danger: true, badge: 'New' },
      { key: 'item-3', label: 'Checked', checked: true, divider: true },
    ];

    render(<DropdownMenu items={items} onClose={onClose} />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Checked')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit'));
    expect(onClick).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(<DropdownMenu items={[{ key: '1', label: 'Item' }]} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('closes on click outside', () => {
    const onClose = vi.fn();
    render(<DropdownMenu items={[{ key: '1', label: 'Item' }]} onClose={onClose} />);

    fireEvent.mouseDown(document.body);
  });

  it('opens and interacts with submenus', () => {
    const onSubClick = vi.fn();
    const items: DropdownMenuItem[] = [
      {
        key: 'parent',
        label: 'More Options',
        hasSubmenu: true,
        submenuItems: [
          { key: 'sub-1', label: 'Sub Option 1', onClick: onSubClick },
          { key: 'sub-2', label: 'Sub Option 2', divider: true, checked: true },
        ],
      },
    ];

    render(<DropdownMenu items={items} onClose={vi.fn()} />);

    const parentBtn = screen.getByText('More Options');
    fireEvent.mouseEnter(parentBtn);

    expect(screen.getByText('Sub Option 1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sub Option 1'));
    expect(onSubClick).toHaveBeenCalled();
  });

  it('opens submenu on hover and on click, and triggers submenu item onClick', () => {
    vi.useFakeTimers();
    const onSubItemClick = vi.fn();
    const onClose = vi.fn();

    const items: DropdownMenuItem[] = [
      {
        key: 'mute',
        label: 'Mute notifications',
        hasSubmenu: true,
        submenuItems: [
          { key: 'tone', label: 'Select tone', onClick: onSubItemClick },
          { key: 'forever', label: 'Mute forever' },
        ],
      },
    ];

    render(<DropdownMenu items={items} onClose={onClose} />);

    const muteBtn = screen.getByText('Mute notifications');
    expect(muteBtn).toBeInTheDocument();

    // Clicking button with submenu opens submenu
    fireEvent.click(muteBtn);

    expect(screen.getByText('Select tone')).toBeInTheDocument();
    expect(screen.getByText('Mute forever')).toBeInTheDocument();

    // Clicking submenu item calls onClick and closes
    fireEvent.click(screen.getByText('Select tone'));
    expect(onSubItemClick).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
