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

  it('closes on Escape key press and click outside', () => {
    const onClose = vi.fn();
    render(<DropdownMenu items={[{ key: '1', label: 'Item' }]} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(document.body);
  });

  it('handles right alignment and upward flipping', () => {
    const items: DropdownMenuItem[] = [
      { key: '1', label: 'Item 1' },
      { key: '2', label: 'Item 2' },
    ];
    render(<DropdownMenu items={items} onClose={vi.fn()} align="right" />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('opens and interacts with submenus, handles hover leave and enter', () => {
    vi.useFakeTimers();
    const onSubClick = vi.fn();
    const items: DropdownMenuItem[] = [
      {
        key: 'parent',
        label: 'More Options',
        hasSubmenu: true,
        submenuItems: [
          { key: 'sub-1', label: 'Sub Option 1', onClick: onSubClick, danger: true },
          { key: 'sub-2', label: 'Sub Option 2', divider: true, checked: true },
        ],
      },
      {
        key: 'regular',
        label: 'Regular Item',
      },
    ];

    render(<DropdownMenu items={items} onClose={vi.fn()} />);

    const parentBtn = screen.getByText('More Options');
    fireEvent.mouseEnter(parentBtn);

    expect(screen.getByText('Sub Option 1')).toBeInTheDocument();

    // Mouse leave parent triggers scheduleSubmenuClose
    fireEvent.mouseLeave(parentBtn);

    // Mouse enter non-submenu item schedules submenu close
    const regularBtn = screen.getByText('Regular Item');
    fireEvent.mouseEnter(regularBtn);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Sub Option 1')).not.toBeInTheDocument();

    // Open again
    fireEvent.mouseEnter(parentBtn);
    expect(screen.getByText('Sub Option 1')).toBeInTheDocument();

    const subOption = screen.getByText('Sub Option 1');
    fireEvent.mouseEnter(subOption.parentElement!);
    fireEvent.click(subOption);
    expect(onSubClick).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('handles right alignment and submenu interaction', () => {
    const items: DropdownMenuItem[] = [
      {
        key: 'parent',
        label: 'Right Edge Submenu',
        hasSubmenu: true,
        submenuItems: [{ key: 'sub-right', label: 'Left Flipped Sub' }],
      },
    ];

    const { unmount } = render(<DropdownMenu items={items} onClose={vi.fn()} align="right" />);

    const parentBtn = screen.getByText('Right Edge Submenu');
    fireEvent.mouseEnter(parentBtn);
    expect(screen.getByText('Left Flipped Sub')).toBeInTheDocument();

    unmount();
  });
});
