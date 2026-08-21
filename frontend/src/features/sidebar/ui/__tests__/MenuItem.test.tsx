import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuItem } from '../MenuItem';
import { Settings } from 'lucide-react';
import React from 'react';

describe('MenuItem', () => {
  it('renders menu item with label, badge, and triggers onClick', () => {
    const onClick = vi.fn();
    render(
      <MenuItem icon={Settings} label="Preferences" badge="New" hasChevron onClick={onClick} />,
    );

    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
