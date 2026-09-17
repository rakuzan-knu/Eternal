import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeMenuItem } from '../ThemeSubmenu';
import { useThemeStore } from '@/shared/model/useThemeStore';
import React from 'react';

describe('ThemeMenuItem', () => {
  it('renders theme selector submenu', () => {
    useThemeStore.setState({ theme: 'dark' });

    render(<ThemeMenuItem />);

    const trigger = screen.getByRole('button', { name: /change appearance/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Soon')).toBeInTheDocument();
  });
});
